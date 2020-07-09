'use strict'

const BB = require('bluebird')

const { exec } = require('child_process')
const which = require('which')
const assert = require('assert')
const log = require('@harrytwright/logger')

exports.mongoimport = BB.promisify(mongoimport)
exports.exec = execMongoimport
exports.whereAndExec = mongoimport

const defaultMongoArgs = ['--jsonArray', '--type', 'json', '--stopOnError', '--file']

// messy but works
// if mongoimport returned codes this could be easier
function createMongoimportError (error_, stderr_, options) {
  if (!error_) return null

  const error = new Error('mongoimport failed')
  error.exit = error_.code
  error.killed = error_.killed
  error.cmd = error_.cmd

  const stderr = stderr_.split('\n')
  const errors = stderr.filter((output) => output.includes('error'));

  if (errors.length > 0) {
    const reason = errors[errors.length - 1]
    const message = reason.split('\t')[1]

    if (message.includes('error connecting to host:')) {
      error.message = 'Could not connect to the mongodb instance'
      error.code = 'EMONGOCONREF'
      error.host = options.uri
    }
  } else {
    // just set a default error for mongoimport failures
    // can then just ask for them to be set as issues
    error.code = 'EMONGO'
  }

  return error
}

/**
 * options will relate the `--{key} and its value`
 *
 * Using find and xargs we can run this multiple times but only call it once
 *
 * see: https://stackoverflow.com/a/41658233/7031674
 * */
function execMongoimport (where, options, cb) {
  log.info('mongoimport', createArgs(options))
  const args = [].concat(createArgs(options), defaultMongoArgs)
  exec(`find ${where} -regex '.*/[^/]*.json' | xargs -L 1 sh -c 'mongoimport ${args.join(' ')} $0 || exit 1'`, (err, stdout, stderr) => {
    // console.log(err, stdout, stderr)
    cb(createMongoimportError(err, stderr, options))
  })
}

function createArgs (options) {
  return Object.keys(options).map((key) => {
    if (typeof options[key] === 'boolean') return `--${key}`
    return `--${key} ${options[key]}`
  })
}

function mongoimport (where, options, cb) {
  assert.strictEqual(typeof cb, 'function', 'no callback provided')
  which('mongoimport', (err) => {
    if (err) {
      err.code = 'ENOMONGO'
      return cb(err)
    }

    execMongoimport(where, options, cb)
  })
}
