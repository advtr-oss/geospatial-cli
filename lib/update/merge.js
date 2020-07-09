'use strict'

const path = require('path')
const { exec } = require('child_process')

const { chain } = require('slide')

const log = require('@harrytwright/logger')

module.exports.exec = merge

function merge (where, output, cb) {
  log.info('find', [`${where}/*.ndjson`])
  log.info('xargs', [`cat > ./${output}`])

  const steps = []

  const dir = path.dirname(output)
  const tmp = path.join(dir, './tmp.txt')

  // Simple to concatenate the required ndjson files into a tmp file
  // then copy the temp files to the output and clean up
  steps.push(
    [exec, `find ./${where} -regex '.*/[^/]*.ndjson'| xargs cat > ./${tmp}`],
    [exec, `cp ${tmp} ${output}`],
    [exec, `rm -fR ${tmp}`]
  )

  chain(steps, cb)
}
