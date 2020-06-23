const fs = require('fs');
const path = require('path');

const ini = require('ini');
const bent = require('bent');
const unzipper = require('unzipper');
const log = require('@harrytwright/logger');

const cli = require('../../cli');

module.exports = function (from, to, state, cb) {
  const geonamesrc = path.join(cli.config.get('cache'), 'geonames/.geonamesrc');
  fs.readFile(geonamesrc, 'utf-8',(err, buffer) => {
    if (err) { return cb(err); }

    const data = require('ini').parse(buffer);
    if (!data[from]) {
      return downloadZIP(data, cb)
    }

    // downside of bent is its promises but we'll make do
    // for now...

    const head = bent('HEAD')
    return head(from)
      .then((response) => new Date(response.headers['last-modified']))
      .then((lastModified) => {
        if (lastModified.getTime() !== (new Date(parseInt(data[from]))).getTime()) {
          return downloadZIP(data, cb);
        }
        return cb()
      })
      .catch(cb);
  });


  function downloadZIP(config, cb) {
    const get = bent('GET');

    log.silly('download:zip', `loading ${from}`)
    return get(from)
      .then(response => Promise.all([Promise.resolve(response.headers), response.arrayBuffer()]))
      .then(([headers, response]) => {
        log.silly('download:zip', `extracting ${from}`);
        return Promise.all([Promise.resolve(headers), unzipper.Open.buffer(response)])
      })
      .then(([headers, response]) => {
        log.silly('download:zip', `saving ${from} to ${to}`);
        return Promise.all([Promise.resolve(headers), response.extract({ path: to })])
      }).then(([headers]) => {
        log.silly('download:zip', `updating config`);
        const geonamesrc = path.join(cli.config.get('cache'), 'geonames/.geonamesrc');
        config[from] = Date.parse(headers['last-modified']);

        return fs.writeFile(geonamesrc, require('ini').stringify(config), cb);
      }).catch(cb)
  }
}
