const config = require('./config.js');

module.exports.updateColumn = async function(userid, column, value) {
    let query = `UPDATE bait SET ${column}=${column}+$1 WHERE userid=$2 RETURNING ${column}`;
    let newValue = (await config.pquery(query, [value, userid]))[0][column];
    return newValue;
}