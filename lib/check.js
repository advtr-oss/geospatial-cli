'use strict'

const fs = require('fs')
const path = require('path')

const chain = require('slide').chain
const log = require('@harrytwright/logger')

const cli = require('./cli')
const git = require('./generate/git')
const Usage = require('./utils/usage')
const getState = require('./utils/state')
const download = require('./generate/network/download')

const check = module.exports = {}

check.usage = new Usage('generate', '\nCheck if the cache is up to date', [
  'geo check',
  'geo check --update'
], '-u, --update')

check.run = function (argv, cb) {
  let state
  try {
    state = getState(true)
  } catch (err) {
    return cb(err)
  }

  return new Checker(state, argv).run(cb)
}

function Checker (state, args) {
  this.args = args

  this.state = state
  this.dryRun = !cli.config.get('update')

  this.started = Date.now()
  this.results = []
}

Checker.prototype = { }

Checker.prototype.run = function (_cb) {
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

  console.log(this);
  if (this.state === getState.STATE.uninitialised && this.dryRun) {
    const error = new Error('Missing cache, unable to check for updates')
    error.code = 'ERNOCACHE'
    return cb(error)
  }

  steps.push([this, this.state === getState.STATE.uninitialised ? this.cloneCountries : this.pullCountries])
  steps.push([this, this.extractGeonameData])

  const postCheckSteps = []
  postCheckSteps.push(
    [this, this.outputResults]
  )

  chain(steps, (err) => {
    if (err) this.failing = true
    chain(postCheckSteps, (postCheckErr) => {
      if (postCheckErr) log.warn('check', postCheckErr.message)
      cb(err)
    })
  })

  return result
}

function checkDownloadTimes(output) {
  return output.lastModified.getTime() !== output.cachedDate.getTime()
}

Checker.prototype.outputResults = function (cb) {
  if (!this.dryRun) {
    log.output('Cache updated, took:', ((Date.now() - this.started) / 1000) + 's')
    return cb()
  }

  const [git, alternate, cities] = this.results

  const actions = []
  if (git && git.type === 'git') {
    actions.push(`Countries:  ${git.update ? 'UPDATE!\t' : 'CLEAN!\t'} ${git.reason.status}`)
  }

  if (alternate && alternate.type === 'download:alternateNames') {
    const reason = []
    reason.push(checkDownloadTimes
      ? 'Your alternate name data is up to date'
      : `Your city data is behind, last modified: ${alternate.reason.lastModified}, run \`$ geo check --update\` to update`)
    actions.push(`Alternate:  ${alternate.update ? 'UPDATE!\t' : 'CLEAN!\t'} ${reason.join('\n')}`)
  }

  if (cities && cities.type === 'download:cities') {
    const reason = []
    reason.push(checkDownloadTimes
      ? 'Your cities data is up to date'
      : `Your city data is behind, last modified: ${cities.reason.lastModified}`)
    actions.push(`Cities:     ${cities.update ? 'UPDATE!\t' : 'CLEAN!\t'} ${reason.join('\n')}`)
  }

  log.output(actions.join('\n'))
  cb()
}

Checker.prototype.cloneCountries = function (cb) {
  log.silly('check', 'cloneCountries')
  return git.exec(['clone', cli.config.get('countries'), path.join(cli.config.get('cache'), 'countries')], cb)
}

function _checkGitStatus (cb) {
  const prefixArgs = ['-C', path.join(cli.config.get('cache'), 'countries')]

  // First we need to get the upstream from github
  git.exec([].concat(prefixArgs, ['fetch', 'origin']), (error) => {
    if (error) { cb(error) }

    return git.exec([].concat(prefixArgs, ['status', '-uno']), cb)
  })
}

Checker.prototype.pullCountries = function (cb) {
  _checkGitStatus((err, stdout) => {
    if (this.dryRun) {
      this.results.push({
        type: 'git',
        update: !stdout.includes('Your branch is up to date'),
        reason: {
          status: stdout.split('\n')[1]
        }
      })

      return cb(null)
    }

    if (stdout.includes('Your branch is up to date') && err === null) {
      return cb(null)
    }

    return git.exec(['-C', path.join(cli.config.get('cache'), 'countries'), 'pull'], cb)
  })
}

Checker.prototype.extractGeonameData = function (cb) {
  log.silly('check', 'extractGeonameData')
  // See `generate.js#L201` for documentation

  const geonamePath = path.join(cli.config.get('cache'), 'geonames')
  if (this.state === getState.STATE.uninitialised || !fs.existsSync(geonamePath)) {
    try {
      fs.mkdirSync(geonamePath)
      fs.writeFileSync(path.join(geonamePath, '.geonamesrc'), '', 'utf-8')
    } catch (err) {
      return cb(err)
    }
  }

  const steps = []

  steps.push(
    [this, this.downloadAlternateNames],
    [this, this.downloadCitiesName]
  )

  return chain(steps, cb)
}

Checker.prototype.downloadAlternateNames = function (cb) {
  log.silly('check', 'extractGeonameData:alternateNames')
  return download(cli.config.get('alternate'), path.join(cli.config.get('cache'), 'geonames/alternateNames'), this.state, this.dryRun, (err, output) => {
    if (this.dryRun) {
      this.results.push({ type: 'download:alternateNames', update: output ? checkDownloadTimes(output) : false, reason: err || output })
    }
    cb(err)
  })
}

Checker.prototype.downloadCitiesName = function (cb) {
  log.silly('check', 'extractGeonameData:citiesName')
  return download(cli.config.get('cities'), path.join(cli.config.get('cache'), 'geonames/'), this.state, this.dryRun, (err, output) => {
    if (this.dryRun) {
      this.results.push({ type: 'download:cities', update: output ? checkDownloadTimes(output) : false, reason: err || output })
    }
    cb(err)
  })
}
