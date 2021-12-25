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

module.exports.fetchWeightCaughtForLeaderboards = async function(useridArray) {
    let query = 'SELECT userid, weight_caught FROM stats WHERE userid=ANY($1)';
    let res = await config.pquery(query, [useridArray]);
    return res;
}

module.exports.integrateCatchServer = async function(serverid, fishWeight) {
    let grams = Math.round(fishWeight*1000);
    let query = 'UPDATE servers SET fish_caught=fish_caught+1, weight_caught=weight_caught+$1 WHERE serverid=$2 RETURNING serverid';
    let res = await config.pquery(query, [grams, serverid]);
    if (!res[0]) {
        await createServerEntry(serverid);
        await config.pquery(query, [grams, serverid]);
    }
    return;
}

module.exports.fetchTotalFishCaught = async function() {
    const fishCaught = (await config.pquery('SELECT SUM(fish_caught) FROM stats'))[0].sum;
    return fishCaught;
}

module.exports.fetchTotalTonsCaught = async function() {
    const weightCaught = (await config.pquery('SELECT SUM(weight_caught) FROM stats'))[0].sum;
    return weightCaught/1000000;
}