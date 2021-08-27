// interact with the aquarium database
const config = require('./config.js');

module.exports.getLargestSize = async function(userid, speciesName) {
    let columnName = speciesName.replace(/ /g, '_');
    let query = `SELECT ${columnName} FROM aquarium WHERE userid=$1`;
    let largestSize = (await config.pquery(query, [userid]))[0][columnName];
    return largestSize;
}

module.exports.setLargestSize = async function(userid, speciesName, size) {
    let columnName = speciesName.replace(/ /g, '_');
    let query = `UPDATE aquarium SET ${columnName}=$1 WHERE userid=$2`;
    await config.pquery(query, [size, userid]);
}

module.exports.getMultiplierValues = async function(userid, fishColumns) {
    let query = `SELECT ${fishColumns.join(', ')} FROM aquarium WHERE userid=$1`;
    let multiplierValues = (await config.pquery(query, [userid]))[0];
    return multiplierValues;
}

module.exports.fetchSpeciesForLeaderboards = async function(useridArray, speciesName) {
    let columnName = speciesName.replace(/ /g, '_');
    let query = `SELECT userid, ${columnName} FROM aquarium WHERE userid=ANY($1) AND ${columnName} IS NOT NULL`;
    let res = await config.pquery(query, [useridArray]);
    return res;
}

module.exports.fetchSpeciesForGlobalLeaderboards = async function(speciesName) {
    let columnName = speciesName.replace(/ /g, '_');
    let query = `SELECT userid, ${columnName} FROM aquarium WHERE ${columnName} IS NOT NULL ORDER BY ${columnName} DESC LIMIT 10`;
    let res = await config.pquery(query, []);
    return res;
}

module.exports.fetchSpeciesUserRanking = async function(userid, speciesName) {
    let columnName = speciesName.replace(/ /g, '_');
    let query = `WITH LIST AS (SELECT userid, ${columnName}, RANK() OVER(ORDER BY ${columnName} DESC) rank FROM aquarium WHERE ${columnName} IS NOT NULL) SELECT rank, ${columnName} FROM list WHERE userid=$1`;
    let res = await config.pquery(query, [userid]);
    return res[0];
}