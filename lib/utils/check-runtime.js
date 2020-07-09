const log = require('@harrytwright/logger')

const cli = require('../cli')

const COMMANDS = {
  ALL: 0x01,
  MONGODB: 0x02,
  ELASTICSEARCH: 0x04
}

/**
 * Due to the lengths of the commands we need to watch for if the
 * user only wishes to run and build datasources for a required
 * source, so as of no either --mongodb or --elasticsearch
 *
 * This is mainly to be used for the update command
 * but can be placed inside of generate too
 * */
module.exports = () => {
  let command = COMMANDS.ALL

  if (cli.config.get('mongodb') === true && cli.config.get('elasticsearch') === true) {
    log.warn('check', 'both --mongodb and --elasticsearch have been set')
    log.warn('check', 'this is redundant and will be ignored')

    return command
  }

  if (cli.config.get('mongodb') === true) {
    command = COMMANDS.MONGODB
  }

  if (cli.config.get('elasticsearch')) {
    command = COMMANDS.ELASTICSEARCH
  }

  return command
}

module.exports.COMMANDS = COMMANDS
