var cli = require('../../cli')
var log = require('@harrytwright/logger');

module.exports = message

function message (err) {
  var short = []
  var detail = []

  switch (err.code) {
    case 'EACCES':
    case 'EPERM':
      const isCachePath = typeof err.path === 'string' &&
        err.path.startsWith(cli.config.get('cache'))
      const isCacheDest = typeof err.dest === 'string' &&
        err.dest.startsWith(cli.config.get('cache'))

      const isWindows = process.platform === 'win32'

      if (!isWindows && (isCachePath || isCacheDest)) {
        // user probably doesn't need this, but still add it to the debug log
        log.verbose(err.stack)
        short.push([
          '',
          [
            '',
            'Your cache folder contains root-owned files',
            '',
            'To permanently fix this problem, please run:',
            `  sudo chown -R ${process.getuid()}:${process.getgid()} ${JSON.stringify(cli.config.get('cache'))}`
          ].join('\n')
        ])
      } else {
        short.push(['', err.message])
        detail.push([
          '',
          [
            '\nThe operation was rejected by your operating system.',
            (process.platform === 'win32'
              ? 'It\'s possible that the file was already in use (by a text editor or antivirus),\n' +
              'or that you lack permissions to access it.'
              : 'It is likely you do not have the permissions to access this file as the current user'),
            '\nIf you believe this might be a permissions issue, please double-check the',
            'permissions of the file and its containing directories, or try running',
            'the command again as root/Administrator.'
          ].join('\n')])
      }
      break
    case 'ENOGIT':
      short.push(['', err.message])
      detail.push([
        '',
        [
          '',
          'Failed using git.',
          'Please check if you have git installed and in your PATH.'
        ].join('\n')
      ])
      break
    case 'ENOENT':
      short.push(['enoent', err.message])
      detail.push([
        'enoent',
        [
          'This is related to products not being able to find a folder/file.',
          err.file ? "\nCheck if the folder/file '" + err.file + "' is present." : ''
        ].join('\n')
      ])
      break
    case 'EMISSINGARG':
    case 'EUNKNOWNTYPE':
    case 'EINVALIDTYPE':
    case 'ETOOMANYARGS':
      short.push(['typeerror', err.stack])
      detail.push([
        'typeerror',
        [
          '',
          'This is an error with products itself. Please report this error to:',
          '    <harryw@resdev.com>'
        ].join('\n')
      ])
      break
    default:
      short.push(['', err.message || err])
      break
  }

  return { short: short, detail: detail }
}

