const config = require('./config.js');

module.exports.fetchLeaderboardsByScore = async function(useridArray) {
    let query = 'SELECT userid, overall FROM scores WHERE userid=ANY($1) ORDER BY overall DESC';
    let res = await config.pquery(query, [useridArray]);
    return res;
}