const fs = require('fs')
const readline = require('readline')

const log = require('@harrytwright/logger')

const records = require('./records')

const startingMemoryUsage = getMemoryUsage()
var lastMemoryUsage
var timeLastLogPrinted

function getMemoryUsage () {
  lastMemoryUsage = Math.ceil(process.memoryUsage().heapUsed / 1024 / 1024)
  return lastMemoryUsage
}

function LineReader (path) {
  this._linereader = readline.createInterface({
    input: fs.createReadStream(path)
  })

  this.on('line', this.printMemoryUsage)
}

LineReader.prototype = {}

LineReader.prototype.printMemoryUsage = function () {
  if ((Date.now() - timeLastLogPrinted) < 3000) {
    // Only log every 3 seconds
    return
  }

  if (lastMemoryUsage === getMemoryUsage()) {
    // Nothing new to report
    return
  }

  // Could do this only if the memory is above say 20MB or something
  log.warn('memory', `Memory usage relative to starting memory: ${lastMemoryUsage - startingMemoryUsage} MB`)
  timeLastLogPrinted = Date.now()
}

LineReader.prototype.on = function (event, func) {
  return this._linereader.on(event, func)
}

function createChildObject (Type) {
  return new Type()
}

const _readline = module.exports = (path, map, Type = Array, cb) => {
  const data = createChildObject(Type)

  const linereader = new LineReader(path)
  linereader.on('line', (line) => {
    const result = map(line)
    if (!result) { return null }

    if (Array.isArray(data)) {
      records.emit('add:city')
      return data.push(result)
    } else if (data instanceof Map) {
      return data.set(result.key, result.value)
    } else {
      throw new TypeError('Invalid Data Type, should be either Array or Map')
    }
  })

  linereader.on('error', cb)
  linereader.on('close', () => cb(null, data))
}

module.exports.array = function (path, map, cb) {
  return _readline(path, map, Array, cb)
}

module.exports.map = function (path, map, cb) {
  return _readline(path, map, Map, cb)
}
