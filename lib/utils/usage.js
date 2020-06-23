'use strict';

const { aliases } = require('../config/command-list');

module.exports = Usage;

function Usage(cmd, description, examples, options) {
  this.cmd = cmd;
  this.description = description;

  if (typeof examples === 'string') { examples = [examples]; }
  this.examples = examples;

  this.options = options;
}

Usage.prototype.toString = function() {
  // eslint-disable-next-line consistent-this
  const self = this;
  const post = Object.keys(aliases).reduce(function(p, c) {
    const val = aliases[c];
    if (val !== self.cmd) { return p; }
    return p.concat(c);
  }, []);


  let txt = this.description;

  if (this.options || this.examples.length > 0 || post.length > 0) { txt += '\n\n'; }

  if (this.examples.length > 0) {
    txt += '  ';
    txt += this.examples.join('\n  ');
    txt += '\n\n';
  }

  if (post.length === 1) {
    txt += 'alias: ';
    txt += post.join(', ');
  } else if (post.length > 1) {
    txt += 'aliases: ';
    txt += post.join(', ');
  }

  if (this.options) {
    if (post.length > 0) txt += '\n';
    txt += 'common options: ' + this.options;
  }

  return txt;
};

