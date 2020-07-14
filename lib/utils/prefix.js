/**
 * prefix.js is a very simple clone of:
 *    <https://github.com/expressjs/morgan>
 *
 * Using it's token and format functions to
 * manipulate javascript into making a custom
 * callback is marvelous. Some minor tweaking
 * is required since we need to generate file
 * paths, so the callback will be slightly
 * more complicated.
 *
 * Usage
 *
 * prefix('default')(command, file, ext)
 *
 * --prefix :dir/:service/:date-:file
 * ./mongodb/12-7-2020-cities.json
 * ./elasticsearch/12-7-2020-cities.ndjson
 * */

const log = require('@harrytwright/logger')

const cli = require('../cli')

module.exports = prefix
module.exports.compile = compile
module.exports.format = format
module.exports.token = token

function prefix (format) {
  let fmt = format

  // I know this is stupid to check but we all know
  // people will try and break it by not adding a file
  const file = fmt.substring(fmt.lastIndexOf('/') + 1)
  if (!file.includes(':file')) {
    log.warn('prefix', `${format} is missing \`:file\`, this will be added at the end of the current format`)
    fmt += '/:file'
  }

  // format function
  const formatLine = typeof fmt !== 'function'
    ? getFormatFunction(fmt)
    : fmt

  return function (command, file) {
    const line = formatLine(prefix, command, file)

    if (!line) {
      return undefined
    }

    return encodeURI(line)
  }
}

prefix.format('default', ':dir/docker/:service/data/:file')

prefix.token('dir', function () {
  return cli.config.get('dir')
})

const map = new Map([])
cli.config.get('map').forEach((item) => {
  const [key, value] = item.split('=')
  map.set(key, value)
})

prefix.token('service', function (command) {
  return map.get(command) || command
})

prefix.token('file', function (_, file) {
  return file
})

prefix.token('date', function getDateToken (command, file, format) {
  var date = new Date()

  switch (format || 'iso') {
    case 'clf':
      return clfdate(date)
    case 'iso':
      return date.toISOString()
    case 'web':
      return date.toUTCString()
  }
})

/**
 * Array of CLF month names.
 * @private
 */

var CLF_MONTH = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
]
/**
 * Format a Date in the common log format.
 *
 * @private
 * @param {Date} dateTime
 * @return {string}
 */

function clfdate (dateTime) {
  var date = dateTime.getUTCDate()
  var hour = dateTime.getUTCHours()
  var mins = dateTime.getUTCMinutes()
  var secs = dateTime.getUTCSeconds()
  var year = dateTime.getUTCFullYear()

  var month = CLF_MONTH[dateTime.getUTCMonth()]

  return pad2(date) + '/' + month + '/' + year +
    ':' + pad2(hour) + ':' + pad2(mins) + ':' + pad2(secs) +
    ' +0000'
}

/**
 * Pad number to two digits.
 *
 * @private
 * @param {number} num
 * @return {string}
 */

function pad2 (num) {
  var str = String(num)

  // istanbul ignore next: num is current datetime
  return (str.length === 1 ? '0' : '') + str
}

/**
 * Compile a format string into a function.
 *
 * @param {string} format
 * @return {function}
 * @public
 */
function compile (format) {
  if (typeof format !== 'string') {
    throw new TypeError('argument format must be a string')
  }

  var fmt = String(JSON.stringify(format))
  var js = '  "use strict"\n  return ' + fmt.replace(/:([-\w]{2,})(?:\[([^\]]+)\])?/g, function (_, name, arg) {
    var tokenArguments = 'command, file'
    var tokenFunction = 'tokens[' + String(JSON.stringify(name)) + ']'

    if (arg !== undefined) {
      tokenArguments += ', ' + String(JSON.stringify(arg))
    }

    return '" +\n    (' + tokenFunction + '(' + tokenArguments + ') || "-") + "'
  })

  // eslint-disable-next-line no-new-func
  return new Function('tokens, command, file', js)
}

/**
 * Define a format with the given name.
 *
 * @param {string} name
 * @param {string|function} fmt
 * @public
 */
function format (name, fmt) {
  prefix[name] = fmt
  return this
}

/**
 * Lookup and compile a named format function.
 *
 * @param {string} name
 * @return {function}
 * @public
 */
function getFormatFunction (name) {
  // lookup format
  var fmt = prefix[name] || name || prefix.default

  // return compiled format
  return typeof fmt !== 'function'
    ? compile(fmt)
    : fmt
}

/**
 * Define a token function with the given name,
 * and callback fn(req, res).
 *
 * @param {string} name
 * @param {function} fn
 * @public
 */
function token (name, fn) {
  prefix[name] = fn
  return this
}
