#!/usr/bin/env node

;(function () {
  process.title = 'geo'

  const log = require('@harrytwright/logger')

  // so we don't get logs when we don't need them
  log.pause() // will be unpaused when config is loaded.
  log.info('it worked if it ends with', 'ok')

  var geo = require('../lib/cli')
  var config = require('@harrytwright/cli-config')

  const { types, shorthands } = require('../lib/config/options')
  const { errorHandler, exit } = require('../lib/utils/error/handler')

  log.verbose('cli', process.argv)

  const conf = config.parse(types, shorthands)
  geo.argv = conf.argv.remain

  if (geo.deref(geo.argv[0])) geo.command = geo.argv.shift()
  else conf.usage = true

  if (conf.version) {
    console.log(geo.version)
    return exit(0)
  }

  if (conf.versions) {
    geo.command = 'version'
    conf.usage = false
    geo.argv = []
  }

  log.info('using', 'geo@%s', geo.version)
  log.info('using', 'node@%s', process.version)

  process.on('uncaughtException', errorHandler)
  process.on('unhandledRejection', errorHandler)

  if (conf.usage && geo.command !== 'help') {
    geo.argv.unshift(geo.command)
    geo.command = 'help'
  }

  // now actually fire up npm and run the command.
  // this is how to use npm programmatically:
  conf._exit = true
  geo.initialise(conf, function (error) {
    if (error) return errorHandler(error)

    geo.commands[geo.command].run(geo.argv, function () {
      errorHandler.apply(this, arguments)
    })
  })
}())
