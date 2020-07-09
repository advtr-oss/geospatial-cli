/**
 * Thank you to npm/cli/lib/utils/git.js
 * */

'use strict'

const BB = require('bluebird')

const exec = require('child_process').execFile
const cli = require('../../cli.js')
const which = require('which')
const git = cli.config.get('git')
const assert = require('assert')
const log = require('@harrytwright/logger')

exports.exec = BB.promisify(execGit)
exports.chainableExec = chainableExec
exports.whichAndExec = whichAndExec

function prefixGitArgs () {
  return process.platform === 'win32' ? ['-c', 'core.longpaths=true'] : []
}

function execGit (args, options, cb) {
  log.info('git', args)
  const fullArgs = prefixGitArgs().concat(args || [])
  return exec(git, fullArgs, options, cb)
}

function chainableExec () {
  var args = Array.prototype.slice.call(arguments)
  return [execGit].concat(args)
}

function whichAndExec (args, options, cb) {
  assert.strictEqual(typeof cb, 'function', 'no callback provided')
  // check for git
  which(git, function (err) {
    if (err) {
      err.code = 'ENOGIT'
      return cb(err)
    }

    execGit(args, options, cb)
  })
}
