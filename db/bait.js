const config = require('./config.js');

module.exports.updateColumn = async function(userid, column, value) {
    let query = `UPDATE bait SET ${column}=${column}+$1 WHERE userid=$2 RETURNING ${column}`;
    let newValue = (await config.pquery(query, [value, userid]))[0][column];
    return newValue;
}

module.exports.fetchBait = async function(userid, baitName) {
    let query = `SELECT ${baitName} FROM bait WHERE userid=$1`;
    let count = (await config.pquery(query, [userid]))[0][baitName];
    return count;
}