const config = require('./config.js');

async function createServerEntry(serverid) {
    let query = 'INSERT INTO servers (serverid) VALUES ($1)';
    await config.pquery(query, [serverid]);
    return;
}

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

module.exports.fetchServerStats = async function(serverid) {
    let query = 'SELECT * FROM servers WHERE serverid=$1';
    let res = (await config.pquery(query, [serverid]))[0];
    if (!res) {
        await createServerEntry(serverid);
        res = { fish_caught: 0, weight_caught: 0, custom_fish_privilege: false };
    }
    query = 'SELECT position FROM (SELECT serverid, RANK() OVER(ORDER BY weight_caught DESC) AS position FROM servers) RESULT WHERE serverid=$1';
    let rank = (await config.pquery(query, [serverid]))[0].position;
    res.fish_caught = parseInt(res.fish_caught);
    res.weight_caught = parseInt(res.weight_caught);
    res.rank = parseInt(rank);
    return res;
}