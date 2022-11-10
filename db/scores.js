const config = require('./config.js');

module.exports.fetchLeaderboardsByScore = async function(useridArray) {
    let query = 'SELECT userid, overall AS value FROM scores WHERE userid=ANY($1) ORDER BY overall DESC LIMIT 20';
    let res = await config.pquery(query, [useridArray]);
    return res;
}

module.exports.fetchLeaderboardsRankByScore = async function(userid, useridArray) {
    let query = 'SELECT rank, value FROM (SELECT userid, overall AS value, RANK() OVER(ORDER BY overall DESC) rank FROM scores WHERE userid=ANY($2)) AS tmp WHERE userid=$1';
    let res = await config.pquery(query, [userid, useridArray]);
    return res[0];
}

module.exports.fetchScores = async function(userid) {
    let query = 'SELECT * FROM scores WHERE userid=$1';
    let scores = (await config.pquery(query, [userid]))[0];
    return scores;
}

module.exports.fetchScoreRanks = async function(userid, locations) {
    const queryMiddle = Array(locations).fill(0).map((_, i) => `l${i+1}, RANK() OVER (ORDER BY l${i+1} DESC) AS l${i+1}_rank`).join(', ');
    let query = `SELECT ranked.* FROM (SELECT userid, overall, RANK() OVER (ORDER BY overall DESC) AS overall_rank, ${queryMiddle} FROM scores) AS ranked WHERE userid=$1`;
    let scores = (await config.pquery(query, [userid]))[0];
    return scores;
}

module.exports.fetchScoreRank = async function(userid, locationId) {
    let query = `SELECT ranked.* FROM (SELECT userid, RANK() OVER (ORDER BY l${locationId} DESC) AS rank FROM scores) AS ranked WHERE userid=$1`;
    let rank = (await config.pquery(query, [userid]))[0].rank;
    return rank;
}

// Setter/Updates
module.exports.setLocationScore = async function(userid, locationId, value) {
    let query = `UPDATE scores SET l${locationId}=$1 WHERE userid=$2`;
    return await config.pquery(query, [value, userid]);
}

const LOCATION_COLUMNS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].map(n => 'l' + n.toString()).join('+');
module.exports.updateOverallScore = async function(userid) {
    let query = `UPDATE scores SET overall=${LOCATION_COLUMNS} WHERE userid=$1`;
    return await config.pquery(query, [userid]);
}

module.exports.setLocationScores = async function(userid, values) {
    let query = 'UPDATE scores SET l1=$1, l2=$2, l3=$3, l4=$4, l5=$5, l6=$6, l7=$7, l8=$8, l9=$9, l10=$10, l11=$11, l12=$12, l13=$13, l14=$14 WHERE userid=$15';
    return await config.pquery(query, [...values, userid]);
}

module.exports.updateOverallScores = async function() {
    let query = 'UPDATE scores SET overall=l1 + l2 + l3 + l4 + l5 + l6 + l7 + l8 + l9 + l10 + l11 + l12 + l13 + l14';
    return await config.pquery(query);
}