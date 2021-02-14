const config = require('./config.js');

module.exports.fetchStats = async function(userid) {
    let query = 'SELECT * FROM stats WHERE userid=$1';
    let stats = (await config.pquery(query, [userid]))[0];
    stats.weight_caught = parseInt(stats.weight_caught);
    return stats;
}

module.exports.integrateCatch = async function(userid, fishWeight) {
    let grams = Math.round(fishWeight*1000);
    let query = 'UPDATE stats SET fish_caught=fish_caught+1, weight_caught=weight_caught+$1 WHERE userid=$2';
    await config.pquery(query, [grams, userid]);
    return;
}