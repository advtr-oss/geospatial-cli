const url = require('url')
const path = require('path')

const osenv = require('osenv')

var home = osenv.home()
var cache = path.join(home, '.geo')

let defaults

Object.defineProperty(exports, 'defaults', {
  get: function () {
    if (defaults) return defaults

    defaults = {
      alternate: 'http://download.geonames.org/export/dump/alternateNames.zip',
      cache: cache,
      countries: 'https://github.com/mledoze/countries.git',
      cities: 'http://download.geonames.org/export/dump/cities15000.zip',
      dir: '.',
      editor: osenv.editor(),
      git: 'git',
      heading: 'geo',
      loglevel: 'notice',
      timing: false,
      usage: false,
      _exit: true
    };

    return defaults
  }
});

const types = {
  alternate: [null, url],
  cache: path,
  countries: [null, url],
  cities: [null, url],
  dir: path,
  editor: String,
  git: String,
  heading: String,
  loglevel: ['silent', 'error', 'notice', 'timing', 'info', 'verbose', 'silly'],
  timing: Boolean,
  usage: Boolean,
  version: Boolean,
  _exit: Boolean
};

const shorthands = {
  silent: ['--loglevel', 'silent'],
  verbose: ['--loglevel', 'verbose'],
  quiet: ['--loglevel', 'warn'],
  help: ['--usage'],
  h: ['--usage'],
  v: ['--version']
};

module.exports.types = types
module.exports.shorthands = shorthands

