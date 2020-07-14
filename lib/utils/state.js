const fs = require('fs')

const log = require('@harrytwright/logger')

const cli = require('../cli')

const STATE = {
  initialised: 0x1,
  uninitialised: 0x2
}

module.exports = getState
module.exports.STATE = STATE

function getState (dryRun = false) {
  if (!cli.config.loaded) {
    throw new Error('Configuration has not been loaded')
  }

  let state = STATE.initialised

  if (!fs.existsSync(cli.config.get('cache'))) {
    log.warn('update', '[!] cache does not exist')
    if (dryRun) return STATE.uninitialised

    log.warn('update', '[!] creating cache')
    const error = fs.mkdirSync(cli.config.get('cache'))
    if (error) {
      throw error
    }

    state = STATE.uninitialised
  }

  return state
}
