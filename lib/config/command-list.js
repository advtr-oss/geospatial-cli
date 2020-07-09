'use strict'

const shorthands = {
  g: 'generate',
  gen: 'generate'
}

const affordances = {
  // 'generate': 'generate',
  // 'code': 'codes',
  // 'verison': 'version'
}

const commands = [
  'generate',
  'help'
  // 'version'
]

module.exports.aliases = Object.assign({}, shorthands, affordances)
module.exports.shorthands = shorthands
module.exports.affordances = affordances
module.exports.commands = commands
