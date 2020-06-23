module.exports = (line) => {
  const [, geonameid, type, value] = line.split('\t');

  if (type === 'iata') {
    return { key: geonameid, value }
  }

  return null
}
