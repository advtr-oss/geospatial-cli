'use strict';

const log = require('@harrytwright/logger')

const cli = require('./cli');
const { commands, shorthands } = require('./config/command-list');

const cmds = commands.concat(Object.keys(shorthands));

module.exports.run = function(args, cb) {
  const argv = cli.config.get('argv').cooked;

  const section = cli.deref(args[0]) || args[0];

  let argnum = 0;
  if (args.length === 2 && ~~args[0]) {
    argnum = ~~args.shift()
  }

  // cli help <noargs>:  show basic usage
  if (!section) {
    const valid = argv[0] === 'help' ? 0 : 1;
    return errorUsage(valid, cb);
  }

  // cli <command> -h: show command usage
  if ((cli.config.get('usage') || section) && cli.commands[section] && cli.commands[section].usage) {
    cli.config.set('loglevel', 'silent')
    log.level = 'silent'

    log.output(cli.commands[section].usage.toString());
    return cb();
  }

  return cb(new Error('Could not find the valid cli page'));
};


function errorUsage(valid, cb) {
  cli.config.set('loglevel', 'silent')
  log.level = 'silent'

  log.output([
    '\nUsage: cli <command>',
    '',
    'where <command> is one of:',
    wrap(cmds),
    '',
    'cli <command> -h  quick help on <command>',
    'cli -l            display full usage info',
    'cli help <term>   search for help on <term>',
    'cli help npm      involved overview',
  ].join('\n'));

  cb(valid);
}

function wrap(arr) {
  const out = [''];
  let l = 0;
  let line;

  line = process.stdout.columns;
  if (!line) {
    line = 60;
  } else {
    line = Math.min(60, Math.max(line - 16, 24));
  }

  arr.sort(function(a, b) { return a < b ? -1 : 1; })
    .forEach(function(c) {
      if (out[l].length + c.length + 2 < line) {
        out[l] += ', ' + c;
      } else {
        out[l++] += ',';
        out[l] = c;
      }
    });
  return out.join('\n    ').substr(2);
}

