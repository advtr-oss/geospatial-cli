var path = require('path')

var gfs = require('graceful-fs')
// Patch the global fs module here at the app level
var fs = gfs.gracefulify(require('fs'))

var EventEmitter = require('events').EventEmitter
var cli = module.exports = new EventEmitter()

var abbrev = require('abbrev')
var log = require('@harrytwright/logger')
var cliconfig = require('./config')
var perf = require('./utils/perf')
var parseJSON = require('./utils/parseJSON')
const { commands, aliases } = require('./config/command-list')

require('./utils/records')

perf.emit('time', 'cli')
perf.on('timing', function (name, finished) {
  log.timing(name, 'Completed in', finished + 'ms')
})

cli.config = {
  loaded: false,
  get: function () {
    throw new Error('cli.load() required')
  },
  set: function () {
    throw new Error('cli.load() required')
  }
}

cli.commands = {}

// TUNING
cli.limit = {
  fetch: 10,
  action: 50
}
// ***

cli.lockfileVersion = 1

cli.rollbacks = []

try {
  // startup, ok to do this synchronously
  var j = parseJSON(fs.readFileSync(
    path.join(__dirname, '../package.json')) + '')
  cli.name = j.name
  cli.version = j.version
} catch (ex) {
  try {
    log.info('error reading version', ex)
  } catch (er) {}
  cli.version = ex
}

const commandCache = {}
const aliasNames = Object.keys(aliases)

let fullList = commands.concat(aliasNames)

const abbrevs = abbrev(fullList)
fullList = cli.fullList = fullList

Object.keys(abbrevs).forEach(function addCommand (c) {
  Object.defineProperty(cli.commands, c, {
    get: function () {
      const a = cli.deref(c)

      cli.command = c
      if (commandCache[a]) return commandCache[a]

      const cmd = require(path.join(__dirname, a + '.js'))

      commandCache[a] = function () {
        const args = Array.prototype.slice.call(arguments, 0)
        if (typeof args[args.length - 1] !== 'function') {
          args.push(defaultCb)
        }
        if (args.length === 1) args.unshift([])

        // Options are prefixed by a hyphen-minus (-, \u2d).
        // Other dash-type chars look similar but are invalid.
        Array(args[0]).forEach(function (arg) {
          if (/^[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/.test(arg)) {
            console.error('arg', 'Argument starts with non-ascii dash, this is probably invalid:', arg)
          }
        })

        cmd.apply(cli, args)
      }

      Object.keys(cmd).forEach(function (k) {
        commandCache[a][k] = cmd[k]
      })

      return commandCache[a]
    },
    enumerable: fullList.indexOf(c) !== -1,
    configurable: true
  })

  // make css-case commands callable via camelCase as well
  if (c.match(/-([a-z])/)) {
    addCommand(c.replace(/-([a-z])/g, function (a, b) {
      return b.toUpperCase()
    }))
  }
})

function defaultCb (er, data) {
  if (er) console.error(er.stack || er.message)
  else console.log(data)
}

cli.deref = function (c) {
  if (!c) return ''
  if (c.match(/[A-Z]/)) {
    c = c.replace(/([A-Z])/g, function (m) {
      return '-' + m.toLowerCase()
    })
  }

  let a = abbrevs[c]
  while (aliases[a]) {
    a = aliases[a]
  }

  return a
}

var loaded = false
var loading = false
var loadErr = null
var loadListeners = []

function loadCb (er) {
  loadListeners.forEach(function (cb) {
    process.nextTick(cb.bind(cli, er, cli))
  })
  loadListeners.length = 0
}

cli.initialise = function (args, cb_) {
  if (!cb_ && typeof args === 'function') {
    cb_ = args
    args = {}
  }

  if (!cb_) cb_ = function () {}
  if (!args) args = {}
  loadListeners.push(cb_)
  if (loaded || loadErr) { return cb(loadErr) }
  if (loading) return
  loading = true

  function cb (er) {
    if (loadErr) { return }
    loadErr = er
    if (er) { return cb_(er) }

    cli.config.loaded = true

    loaded = true
    loadCb(loadErr = er)
  }

  log.pause()

  initialise(cli, args, cb)
}

function initialise (geo, cli, cb) {
  cliconfig.load(cli, function (err, config) {
    let er
    if (!config) { config = err; er = null }
    if (er === config) er = null

    geo.config = config
    if (er) return cb(er)

    /**
     * Run any config changes
     * */

    if (geo.config.get('timing') && geo.config.get('loglevel') === 'notice') {
      log.level = 'timing'
    } else {
      log.level = config.get('loglevel')
    }
    log.heading = config.get('heading') || 'geo'

    log.resume()

    return cb(null, geo)
  })
}
