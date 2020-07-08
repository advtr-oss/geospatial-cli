const path = require('path');
const tmpdir = require('os').tmpdir()

const cli = require('../cli');

let tmp = tmpdir
if (cli.config.loaded) {
  tmp = cli.config.get('tmp');
}

module.exports.customName = (ext = 'txt', dir = tmp) => {
  var now = new Date();
  var name = [
    now.getFullYear(), now.getMonth(), now.getDate(),
    '-',
    process.pid,
    '-',
    (Math.random() * 0x100000000 + 1).toString(36),
    `.${ext}`].join('');
  return path.join(dir, name);
};
