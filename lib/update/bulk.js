const { exec } = require('child_process')

const log = require('@harrytwright/logger')

const cli = require('../cli')

exports.bulk = bulkCURL

const prefixCURLArgs = [
  '-XPOST', '-H', '"Content-Type:application/x-ndjson"', '--silent', '--create-dirs',
  '--show-error', '--fail', '--write-out', '"%{http_code}"'
]

function bulkCURL (where, data, tmp, cb) {
  const args = ['--output', tmp, '--data-binary', `"@./${data}"`, `"${where}/${cli.config.get('collection')}/_bulk?pretty"`]
  log.info('curl', args)

  exec(`curl ${[].concat(prefixCURLArgs, args).join(' ')}`, cb)
}
