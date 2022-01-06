// interact with the aquarium database
const config = require('./config.js');

module.exports.getFish = async function(userid, fishNames) {
    let query = `SELECT ${fishNames.join(', ')} FROM aquarium WHERE userid=$1`;
    let fishValues = (await config.pquery(query, [userid]))[0];
    return fishValues;
}

module.exports.setColumn = async function(userid, column, value) {
    let query = `UPDATE aquarium SET ${column}=$1 WHERE userid=$2`;
    return await config.pquery(query, [value, userid]);
}

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

module.exports.fetchSpeciesForLeaderboards = async function(useridArray, fishName) {
    let query = `SELECT userid, ${fishName} AS r FROM aquarium WHERE userid=ANY($1) AND NOT ${fishName}=-1 ORDER BY ${fishName} DESC LIMIT 10`;
    let res = await config.pquery(query, [useridArray]);
    return res;
}

module.exports.fetchSpeciesForGlobalLeaderboards = async function(fishName) {
    let query = `SELECT userid, ${fishName} AS r FROM aquarium WHERE NOT ${fishName}=-1 ORDER BY ${fishName} DESC LIMIT 10`;
    let res = await config.pquery(query);
    return res;
}

module.exports.fetchSpeciesRanking = async function(userid, useridArray, fishName) {
    let query = `WITH list AS (SELECT userid, ${fishName}, RANK() OVER(ORDER BY ${fishName} DESC) rank FROM aquarium WHERE userid=ANY($1) AND NOT ${fishName}=-1) SELECT rank, ${fishName} AS r FROM list WHERE userid=$2`;
    let res = await config.pquery(query, [useridArray, userid]);
    return res[0];
}

module.exports.fetchGlobalSpeciesRanking = async function(userid, fishName) {
    let query = `WITH list AS (SELECT userid, ${fishName}, RANK() OVER(ORDER BY ${fishName} DESC) rank FROM aquarium WHERE NOT ${fishName}=-1) SELECT rank, ${fishName} AS r FROM list WHERE userid=$1`;
    let res = await config.pquery(query, [userid]);
    return res[0];
}

module.exports.getAllData = async function() {
    let query = 'SELECT * FROM aquarium';
    let res = await config.pquery(query);
    return res;
}