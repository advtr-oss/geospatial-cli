'use strict'

const fs = require('fs')
const path = require('path')

const chain = require('slide').chain
const log = require('@harrytwright/logger')

const cli = require('./cli')
const Usage = require('./utils/usage')
const prefix = require('./utils/prefix')
const { bulk } = require('./update/bulk')
const merge = require('./update/merge').exec
const tmp = require('./utils/tmp').customName
const check = require('./utils/check-runtime')
const mongoimport = require('./update/mongoimport').whereAndExec

const update = module.exports = {}

update.usage = new Usage('update', '\nUpdate the external data with new information', [
  'geo update'
], '[--dir=.] [--mongouri=localhost:27017] [--elasticsearch]')

update.run = function (argv, cb) {
  const where = argv[0] ? argv[0] : cli.config.get('dir')
  cli.config.set('dir', where || cli.config.get('dir'))

  const _where = prefix(cli.config.get('prefix'))

  if (!fs.existsSync(path.dirname(_where('mongodb', 'file.ext'))) || !fs.existsSync(path.dirname(_where('elasticsearch', 'file.ext')))) {
    const error = new Error('Missing required datasources')
    error.file = !fs.existsSync(path.join(where, './docker/database/data'))
      ? path.join(where, './docker/database/data')
      : path.join(where, './docker/elasticsearch/data')
    error.code = 'ENOENT'
    throw error
  }

  return new Updater(_where, argv).run(cb)
}

function Updater (prefix, args) {
  this.prefix = prefix

  this.args = args

  this.failing = false
  this.started = Date.now()
}

Updater.prototype = {}

Updater.prototype.run = function (_cb) {
  var result
  var cb
  if (_cb) {
    cb = function () {
      return _cb.apply(this, arguments)
    }
  } else {
    result = new Promise((resolve, reject) => {
      cb = (err, value) => err ? reject(err) : resolve(value)
    })
  }

  const steps = []

  const command = check()

  if (command === check.COMMANDS.MONGODB || command === check.COMMANDS.ALL) {
    const where = path.dirname(this.prefix('mongodb', 'file.ext'))
    steps.push(
      [mongoimport, where, {
        uri: cli.config.get('mongouri'),
        collection: cli.config.get('collection')
      }]
    )
  }

  if (command === check.COMMANDS.ELASTICSEARCH || command === check.COMMANDS.ALL) {
    const where = path.dirname(this.prefix('elasticsearch', 'file.ext'))
    const mergedData = path.join(where, './geolocation.ndjson')
    const response = tmp('json')

    steps.push(
      [merge, where, mergedData],
      [bulk, cli.config.get('elasticsearchuri'), mergedData, response],
      [fs.unlink, mergedData]
    )

    const levels = ['verbose', 'silly']
    if (!levels.includes(cli.config.get('loglevel'))) {
      steps.push(
        [fs.unlink, response]
      )
    } else {
      log.verbose('update:bulk', `curl response will be saved at ${response}`)
    }
  }

  chain(steps, cb)

  return result
}
