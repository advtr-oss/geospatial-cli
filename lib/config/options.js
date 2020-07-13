const url = require('url')
const path = require('path')

const osenv = require('osenv')

let tmp = osenv.tmpdir()
if (tmp) {
  tmp = path.join(tmp, 'com.advtr.geo')
} else {
  // set a small customer tmp dir if we can't get a dir
  // might never get used, but better to be save for now
  tmp = path.join(process.cwd(), './.tmp/com.advtr.geo')
}

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
      elasticsearch: null,
      elasticsearchuri: 'localhost:9200',
      git: 'git',
      heading: 'geo',
      loglevel: 'notice',
      map: ['mongodb=database', 'elasticsearch=elastic'],
      mongodb: null,
      mongouri: 'mongodb://localhost:27017/geo',
      prefix: ':dir/docker/:service/data/:file',
      collection: 'geo',
      timing: false,
      tmp: tmp,
      usage: false,
      _exit: true
    }

    return defaults
  }
})

const types = {
  alternate: [null, url],
  cache: path,
  countries: [null, url],
  cities: [null, url],
  dir: path,
  editor: String,
  elasticsearch: [null, Boolean],
  elasticsearchuri: [String, url],
  git: String,
  heading: String,
  loglevel: ['silent', 'error', 'notice', 'timing', 'info', 'verbose', 'silly'],
  map: Array,
  mongodb: [null, Boolean],
  mongouri: [String, url],
  collection: String,
  prefix: String,
  timing: Boolean,
  tmp: path,
  usage: Boolean,
  version: Boolean,
  _exit: Boolean
}

const shorthands = {
  silent: ['--loglevel', 'silent'],
  verbose: ['--loglevel', 'verbose'],
  quiet: ['--loglevel', 'warn'],
  help: ['--usage'],
  h: ['--usage'],
  v: ['--version'],
  mongo: ['--mongodb'],
  M: ['--mongodb'],
  elastic: ['--elasticsearch'],
  E: ['--elasticsearch'],
  P: ['--prefix']
}

module.exports.types = types
module.exports.shorthands = shorthands
