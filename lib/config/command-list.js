'use strict';

const shorthands = {
  'u': 'update'
};

const affordances = {
  'udate': 'update',
  // 'code': 'codes',
  // 'verison': 'version'
};

const commands = [
  'update',
  'help',
  // 'version'
];

module.exports.aliases = Object.assign({}, shorthands, affordances);
module.exports.shorthands = shorthands;
module.exports.affordances = affordances;
module.exports.commands = commands;

