const EventEmitter = require('events').EventEmitter

const perf = module.exports = new EventEmitter()

/**
 * Just for a log at the end, since only really WARN gets shown
 *
 * Should also save things like did we git pull or was countries
 * up to date, same with cities
 * */
const records = {
  cities: 0,
  countries: 0
}

process.on('add:city', addCity)
process.on('add:country', addCountry)

perf.on('add:city', addCity)
perf.on('add:country', addCountry)

function addCity () {
  records.cities += 1
}

function addCountry () {
  records.countries += 1
}

perf.records = records
