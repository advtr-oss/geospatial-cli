var once = require('once')
var config = require('@harrytwright/cli-config')

var options = require('./options.js')

var loading = false
var loadCbs = []

Object.defineProperty(exports, 'defaults', {
  get: function () {
    return options.defaults
  },
  enumerable: true
})

Object.defineProperty(exports, 'types', {
  get: function () {
    return options.types
  },
  enumerable: true
})

module.exports.load = (_cli, _cb) => {
  let cli, cb
  cb = _cb
  cli = _cli

  if (!cb) cb = function () {}

  // either a fresh object, or a clone of the passed in obj
  if (!cli) {
    cli = {}
  } else {
    cli = Object.keys(cli).reduce(function (c, k) {
      c[k] = cli[k]
      return c
    }, {})
  }

  loadCbs.push(cb)
  if (loading) return

  loading = true

  cb = once(function (er, conf) {
    if (!er) {
      exports.loaded = conf
      loading = false
    }
    loadCbs.forEach(function (fn) {
      fn(er, conf)
    })
    loadCbs.length = 0
  })

  return config.load(options.types, cli, options.defaults, cb)
}
