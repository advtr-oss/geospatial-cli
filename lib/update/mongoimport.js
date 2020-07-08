'use strict';

const BB = require('bluebird');

const { exec } = require('child_process');
const which = require('which');
const assert = require('assert');
const log = require('@harrytwright/logger');

exports.mongoimport = BB.promisify(mongoimport);
exports.exec  = execMongoimport;
exports.whereAndExec = mongoimport;

const defaultMongoArgs = ['--jsonArray', '--type', 'json', '--file'];

/**
 * options will relate the `--{key} and its value`
 *
 * Using find and xargs we can run this multiple times but only call it once
 *
 * see: https://stackoverflow.com/a/41658233/7031674
 * */
function execMongoimport(where, options, cb) {
  log.info('mongoimport', createArgs(options));
  let args = [].concat(createArgs(options), defaultMongoArgs);
  exec(`find ./${where} -regex '.*/[^/]*.json' | xargs -L 1 mongoimport ${args.join(' ')}`, cb);
}

function createArgs(options) {
  return Object.keys(options).map((key) => {
    if (typeof options[key] === "boolean") return `--${key}`;
    return `--${key} ${options[key]}`
  })
}

function mongoimport(where, options, cb) {
  assert.equal(typeof cb, 'function', 'no callback provided');
  which('mongoimport', (err) => {
    if (err) {
      err.code = 'ENOMONGO';
      return cb(err)
    }

    execMongoimport(where, options, cb)
  })
}
