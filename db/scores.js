const config = require('./config.js');

module.exports.fetchLeaderboardsByScore = async function(useridArray) {
    let query = 'SELECT userid, overall FROM scores WHERE userid=ANY($1) ORDER BY overall DESC';
    let res = await config.pquery(query, [useridArray]);
    return res;
}

module.exports.fetchScores = async function(userid) {
    let query = 'SELECT * FROM scores WHERE userid=$1';
    let scores = (await config.pquery(query, [userid]))[0];
    return scores;
}

module.exports.setLocationScore = async function(userid, locationId, value) {
    let query = `UPDATE scores SET l${locationId}=$1 WHERE userid=$2`;
    return await config.pquery(query, [value, userid]);
}

const LOCATION_COLUMNS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(n => 'l' + n.toString()).join('+');
module.exports.updateOverallScore = async function(userid) {
    let query = `UPDATE scores SET overall=${LOCATION_COLUMNS} WHERE userid=$1`;
    return await config.pquery(query, [userid]);
}