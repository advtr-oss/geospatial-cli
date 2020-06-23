/**
 * Could be better in the future if this could be dynamically updated
 * maybe??
 *
 * For now this is the MongoDB version, with extra details, can be removed upon request
 * */
module.exports.mongodb = (codes) => {
  return (line) => {
    const components = line.split('\t');
    const [geonameid, , asciiname, , latitude, longitude, , , country, cc2 = 'N/A', admin1 = 'N/A', admin2 = 'N/A', admin3 = 'N/A', admin4 = 'N/A'] = components;

    const code = {}
    if (codes.has(geonameid)) {
      code['iata'] = codes.get(geonameid);
    }

    return {
      name: asciiname,
      __t: 'city',
      placeid: geonameid,
      geometry: {
        type: "Point",
        coordinates: [
          parseFloat(longitude), parseFloat(latitude)
        ]
      },
      country
    }
  }
}
