'use strict'

const fs = require('fs')
const path = require('path')

const iferr = require('iferr')
const mkdirp = require('mkdirp')
const chain = require('slide').chain
const log = require('@harrytwright/logger')

const cli = require('./cli')
const git = require('./update/git')
const Usage = require('./utils/usage')
const records = require('./utils/records')
const readline = require('./utils/readline')
const citySchema = require('./update/schema/city')
const download = require('./update/network/download')
const alternate = require('./update/schema/alternate')

const generate = module.exports = {}

generate.usage = new Usage('update', '\nUpdate the geolocation data', [
  'geo update'
], '[--dir=.]\n')

const STATE = {
  initialised: 0x1,
  uninitialised: 0x2
}

//
generate.run = function (argv, cb) {
  let state = STATE.initialised

  if (!fs.existsSync(cli.config.get('cache'))) {
    log.warn('update', '[!] cache does not exist')
    log.warn('update', '[!] creating cache')

    const error = fs.mkdirSync(cli.config.get('cache'))
    if (error) {
      return cb(error)
    }

    state = STATE.uninitialised
  }

  return new Updater(argv[0], state, argv).run(cb)
}

function Updater (where, state, args) {
  this.args = args

  this.where = where || cli.config.get('dir')
  this.state = state

  this.alternateNames = []
  this.countries = []
  this.cities = []

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

  /**
   * Now we should download the zip files for the cities and alternative names
   *
   * Here we should also have a .geonamesrc ini file that holds the URL used
   * and the Last-Modified header so we should only download if its the newest
   * version, this with the git status will allow for a smoother deployment
   * and faster speeds, especially with downloading, as reading the geonames
   * files line by line is a killer for time
   *
   * Should in the future possibly have a rough estimate of post zipped file
   * sizes in place so first time building we can check if this can be installed
   * first. Easy to check using Content-Length, to see if we can download the file
   * then check using the following command.
   * `$ bc<<<"$(unzip -l ./alternateNames.zip | tail -1 | xargs | cut -d' ' -f1)/1000/1000"`
   * this will get us the unzipped size in MB
   * */

  // process is download the zip files if needed and then
  // extract the data, this is where memory could become
  // a pain so ~/.geo/tmp/ will contain JSON files for
  // alternateNames so we can strip the undesired values
  //
  // So we download and parse the alternateNames first, save
  // them to a temp file, filtering the undesired values
  // before then doing the same with the city values
  // here we will also save them to a temp JSON file
  // so the ELK and MongoDB values can be created using
  // RAM efficient techniques for both, i.e map for MongoDB
  // and just a simple fs.writeFile for the ELK since both
  // will have differing data

  const steps = []

  steps.push(
    [this.newTracker('cache:initialise')],
    [this.newTracker(`cache:initialise:${this.state === STATE.uninitialised ? 'clone' : 'pull'}`)],
    [this, this.state === STATE.uninitialised ? this.cloneCountries : this.pullCountries],
    [this, this.finishTracker, `cache:initialise:${this.state === STATE.uninitialised ? 'clone' : 'pull'}`],
    [this, this.finishTracker, 'cache:initialise']
  )

  steps.push(
    [this.newTracker('cache:download')],
    [this, this.extractGeonameData],
    [this, this.finishTracker, 'cache:download']
  )

  steps.push(
    [this.newTracker('handle:countries')],
    [this, this.handleCountries],
    [this, this.finishTracker, 'handle:countries']
  )

  steps.push(
    [this.newTracker('handle:cities')],
    [this, this.handleCites],
    [this, this.finishTracker, 'handle:cities']
  )

  const postUpdateSteps = []
  postUpdateSteps.push(
    [this, this.printUpdated]
  )

  const self = this
  chain(steps, function (err) {
    if (err) self.failing = true
    chain(postUpdateSteps, function (postErr) {
      if (err && postErr) {
        log.output(err.message)
        log.output(postErr.message)
      }

      return cb(err || postErr)
    })
  })

  return result
}

Updater.prototype.newTracker = function (name) {
  return function (next) {
    process.emit('time', 'stage:' + name)
    next()
  }
}

Updater.prototype.finishTracker = function (name, cb) {
  process.emit('timeEnd', 'stage:' + name)
  cb()
}

// Should really have a config file that holds the git and geonames uri
// cli.config.get('countries'); ~= 'https://github.com/mledoze/countries.git'
Updater.prototype.cloneCountries = function (cb) {
  log.silly('update', 'cloneCountries')
  return git.exec(['clone', cli.config.get('countries'), path.join(cli.config.get('cache'), 'countries')], cb)
}

function _checkGitStatus (cb) {
  return git.exec(['status', '-uno'], cb)
}

Updater.prototype.pullCountries = function (cb) {
  _checkGitStatus(stdout => {
    // No point updating if its the most recent ref
    if (stdout === null) { return cb(null) }

    log.silly('update', 'pullCountries')
    return git.exec(['-C', path.join(cli.config.get('cache'), 'countries'), 'pull'], cb)
  })
}

Updater.prototype.extractGeonameData = function (cb) {
  /**
   * Now we should download the zip files for the cities and alternative names
   *
   * Here we should also have a .geonamesrc ini file that holds the URL used
   * and the Last-Modified header so we should only download if its the newest
   * version, this with the git status will allow for a smoother deployment
   * and faster speeds, especially with downloading, as reading the geonames
   * files line by line is a killer for time
   *
   * Should in the future possibly have a rough estimate of post zipped file
   * sizes in place so first time building we can check if this can be installed
   * first. Easy to check using Content-Length, to see if we can download the file
   * then check using the following command.
   * `$ bc<<<"$(unzip -l ./alternateNames.zip | tail -1 | xargs | cut -d' ' -f1)/1000/1000"`
   * this will get us the unzipped size in MB
   * */

  const geonamePath = path.join(cli.config.get('cache'), 'geonames')
  if (this.state === STATE.uninitialised || !fs.existsSync(geonamePath)) {
    try {
      fs.mkdirSync(geonamePath)
      fs.writeFileSync(path.join(geonamePath, '.geonamesrc'), '', 'utf-8')
    } catch (err) {
      return cb(err)
    }
  }

  const steps = []
  steps.push(
    [this.newTracker('download:zip:downloadAlternateNames')],
    [this, this.downloadAlternateNames],
    [this, this.finishTracker, 'download:zip:downloadAlternateNames']
  )

  steps.push(
    [this.newTracker('download:zip:downloadCitiesName')],
    [this, this.downloadCitiesName],
    [this, this.finishTracker, 'download:zip:downloadCitiesName']
  )

  return chain(steps, cb)
}

Updater.prototype.downloadAlternateNames = function (cb) {
  return download(cli.config.get('alternate'), path.join(cli.config.get('cache'), 'geonames/alternateNames'), this.state, cb)
}

Updater.prototype.downloadCitiesName = function (cb) {
  return download(cli.config.get('cities'), path.join(cli.config.get('cache'), 'geonames/'), this.state, cb)
}

Updater.prototype.handleCountries = function (cb) {
  // safer to access the js file in case anything changes in the future
  // we could technically save this as a dependency but this allows for
  // updates even if the code is older, no relevance on the NPM package
  // being up to date
  const countries = require(path.join(cli.config.get('cache'), 'countries/index.js')).map((country) => ({
    name: country.name.common,
    placeid: `${country.cca2}_${country.name.common}`.replace(/ /g, ''),
    __t: 'country',
    currencies: country.currencies,
    region: country.region,
    subregion: country.subregion,
    languages: country.languages,
    alert: {
      status: country.status
    },
    codes: {
      cca2: country.cca2,
      cca3: country.cca3
    }
  }))

  countries.forEach(() => records.emit('add:country'))

  // For now only the database json is saved
  // might be easier to add another chain like
  // used in other functions
  //
  // need to figure out the mapping for elasticsearch
  // so I can at least have the option if needs be
  //
  // Would be easier to map the data to start with and then
  // pass by reference to save space and memory
  const steps = []

  steps.push(
    [this, this.saveMongoDBCountryData, countries],
    [this, this.saveELKCountryData]
  )

  return chain(steps, cb)
}

Updater.prototype.saveMongoDBCountryData = function (countries, cb) {
  const where = path.join(this.where, './docker/database/data')
  return mkdirp(where).then(() => {
    // this is smaller and safer to hold the data that can be then
    // literally mapped, pun intended, into the cities for
    this.countries = new Map(countries.map((country) => [country.codes.cca2, country.name]))

    fs.writeFile(path.join(where, './countries.json'), JSON.stringify(countries, '', null), cb)
  }).catch(cb)
}

Updater.prototype.saveELKCountryData = function (cb) {
  const where = path.join(this.where, './docker/elasticsearch/data')
  return mkdirp(where).then(() => {
    // this is smaller and safer to hold the data that can be then
    // literally mapped, pun intended, into the cities for
    const countries = []
    this.countries.forEach((value, key) => {
      countries.push({
        index: { _index: 'geo', _id: `${key}_${value}`.replace(/ /g, '') }
      })

      countries.push({
        country_iso_code: key,
        country_name: value,
        name: value,
        type: 'country'
      })
    })

    const data = countries.map((item) => JSON.stringify(item, '', null))
    data.push('') // For the ndjson

    fs.writeFile(path.join(where, './countries.ndjson'), data.join('\n'), cb)
  }).catch(cb)
}

Updater.prototype.handleCites = function (cb) {
  const steps = []

  const basePath = path.join(cli.config.get('cache'), 'geonames')
  steps.push(
    [this, this.readAlternateNames, path.join(basePath, 'alternateNames/alternateNames.txt')],
    [this, this.readCityNames, path.join(basePath, 'cities15000.txt')]
  )

  steps.push(
    [this, this.saveMongoDBCityName],
    [this, this.saveELKCityData]
  )

  // readline()

  return chain(steps, cb)
}

Updater.prototype.saveMongoDBCityName = function (cb) {
  const where = path.join(this.where, './docker/database/data')

  return mkdirp(where).then(() => {
    fs.writeFile(path.join(where, './cities.json'), JSON.stringify(this.cities, '', null), cb)
  }).catch(cb)
}

Updater.prototype.saveELKCityData = function (cb) {
  const where = path.join(this.where, './docker/elasticsearch/data')
  return mkdirp(where).then(() => {
    const cities = []
    this.cities.forEach((city) => {
      cities.push({
        index: { _index: 'geo', _id: city.placeid }
      })

      // This schema can be modified if needs be
      // but is just a mild take on the ECS
      cities.push({
        city_name: city.name,
        country_iso_code: city.country,
        country_name: this.countries.get(city.country),
        name: `${city.name}, ${this.countries.get(city.country)}`,
        type: 'city'
      })
    })

    const data = cities.map((item) => JSON.stringify(item, '', null))
    data.push('') // For the ndjson

    fs.writeFile(path.join(where, './cities.ndjson'), data.join('\n'), cb)
  }).catch(cb)
}

Updater.prototype.readAlternateNames = function (where, cb) {
  return readline(where, alternate, Map, iferr(cb, (data) => {
    this.alternateNames = data

    cb()
  }))
}

Updater.prototype.readCityNames = function (where, cb) {
  return readline(where, citySchema.mongodb(this.alternateNames), Array, iferr(cb, (data) => {
    this.cities = data

    cb()
  }))
}

Updater.prototype.printUpdated = function (cb) {
  log.silly('update', 'printUpdated')

  const { cities, countries } = records.records

  var report = ''
  var actions = []

  if (cities) {
    actions.push(`updated ${cities} cit${(cities > 1 ? 'ies' : 'y')}`)
  }
  if (countries) {
    actions.push(`added ${countries} countr${(countries > 1 ? 'ies' : 'y')}`)
  }

  if (actions.length === 0) {
    report += 'up to date'
  } else if (actions.length === 1) {
    report += actions[0]
  } else {
    var lastAction = actions.pop()
    report += actions.join(', ') + ' and ' + lastAction
  }
  report += ' in ' + ((Date.now() - this.started) / 1000) + 's'

  log.output(report)

  cb()
}
