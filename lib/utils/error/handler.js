require('colors')

var cli = require('../../cli')
var log = require('@harrytwright/logger')

var errorMessage = require('./message')

module.exports = { exit: exit, errorHandler: handler }

var itWorked = false
var cbCalled = false
var exitCode = 0

var timings = {
  version: cli.version,
  command: process.argv.slice(2),
  logfile: null
}

process.on('timing', function (name, value) {
  if (timings[name]) { timings[name] += value } else { timings[name] = value }
})

process.on('exit', function (code) {
  process.emit('timeEnd', 'cli')
  // log.disableProgress()

  if (code) itWorked = false
  if (itWorked) {
    log.info('ok')
  } else {
    if (!cbCalled) {
      log.error('', 'cb() never called!')
      console.error('')
      log.error('', 'This is an error with products itself. Please report this error to:')
      log.error('', '    <harryw@resdev.com>')
    }

    if (code) {
      log.verbose('code', code)
    }
  }

  var doExit = cli.config.loaded && cli.config.get('_exit')
  if (doExit) {
    // actually exit.
    if (exitCode === 0 && !itWorked) {
      exitCode = 1
    }
    if (exitCode !== 0) process.exit(exitCode)
  } else {
    itWorked = false // ready for next exit
  }
})

function exit (code) {
  exitCode = exitCode || process.exitCode || code

  var doExit = cli.config.loaded ? cli.config.get('_exit') : true

  log.verbose('exit', 'exit', [code, doExit])

  reallyExit()

  function reallyExit (err) {
    if (err && !code) code = typeof err.errno === 'number' ? err.errno : 1

    itWorked = !code
    // Exit directly -- nothing in the CLI should still be running in the
    // background at this point, and this makes sure anything left dangling
    // for whatever reason gets thrown away, instead of leaving the CLI open
    //
    // Commands that expect long-running actions should just delay `cb()`
    process.stdout.write('', () => {
      process.exit(code)
    })
  }
}

function handler (err) {
  // log.disableProgress()
  if (!cli.config || !cli.config.loaded) {
    // logging won't work unless we pretend that it's ready
    err = err || new Error('Exit prior to config file resolving.')
    console.error(err.stack || err.message)
  }

  if (cbCalled) {
    err = err || new Error('Callback called more than once.')
  }

  cbCalled = true
  if (!err) return exit(0)
  if (typeof err === 'string') {
    log.error('exit', err)
    return exit(1)
  } else if (!(err instanceof Error)) {
    log.error('exit', err)
    return exit(1)
  }

  var m = err.code || err.message.match(/^(?:Error: )?(E[A-Z]+)/)
  if (m && !err.code) {
    err.code = m
  }

  ;[
    'type',
    'stack',
    'statusCode',
    'pkgid'
  ].forEach(function (k) {
    var v = err[k]
    if (!v) return
    log.verbose(k, v)
  })

  log.verbose('', '')
  log.verbose('cwd', process.cwd())

  var os = require('os')
  log.verbose('', '')
  log.verbose('os', os.type() + ' ' + os.release())
  log.verbose('argv', process.argv.map(JSON.stringify).join(' '))
  log.verbose('node', process.version)
  log.verbose('npm ', 'v' + cli.version)

  var space = false
  ;[
    'code',
    'syscall',
    'file',
    'path',
    'dest',
    'errno'
  ].forEach(function (k) {
    var v = err[k]
    if (v) {
      if (!space) { log.error('', ''); space = !space }
      log.error(k, v)
    }
  })

  log.error('', '')
  var msg = errorMessage(err)
  msg.short.concat(msg.detail).forEach(function (errline) {
    log.error.apply(log, errline)
  })
  if (cli.config && cli.config.get('json')) {
    var error = {
      error: {
        code: err.code,
        summary: messageText(msg.summary),
        detail: messageText(msg.detail)
      }
    }

    console.log(JSON.stringify(error, null, 2))
  }

  exit(typeof err.errno === 'number' ? err.errno : 1)
}

function messageText (msg) {
  return msg.map(function (line) {
    return line.slice(1).join(' ')
  }).join('\n')
}
