const EventEmitter = require('events').EventEmitter

const log = require('@harrytwright/logger')

const perf = module.exports = new EventEmitter()
const timings = {}

process.on('time', time)
process.on('timeEnd', timeEnd)

perf.on('time', time)
perf.on('timeEnd', timeEnd)

function time (name) {
  timings[name] = Date.now()
}

function timeEnd (name) {
  if (name in timings) {
    perf.emit('timing', name, Date.now() - timings[name])
    delete timings[name]
  } else {
    log.error("Tried to end timer that doesn't exist: " + name)
  }
}
