const config = require('./config.js');

async function createServerEntry(serverid) {
    let query = 'INSERT INTO servers (serverid) VALUES ($1) RETURNING *';
    let res = await config.pquery(query, [serverid]);
    return res;
}

async function fetchServer(serverid) {
    let query = 'SELECT * FROM servers WHERE serverid=$1';
    let res = await config.pquery(query, [serverid]);
    if (!res[0]) {
        res = await createServerEntry(serverid);
    }
    return res[0];
}

module.exports.fetchServer = fetchServer;

module.exports.setColumn = async function(serverid, column, value) {
    let query = `UPDATE servers SET ${column}=$1 WHERE serverid=$2`;
    await config.pquery(query, [value, serverid]);
    return;
}

module.exports.updateColumns = async function(serverid, obj) {
    let queryMiddle = Object.keys(obj).map((key, i) => `${key}=${key} + $${i+2}`).join(', ');
    let query = `UPDATE servers SET ${queryMiddle} WHERE serverid=$1 RETURNING *`;
    let server = (await config.pquery(query, [serverid, ...Object.values(obj)]))[0];
    return server;
}

module.exports.setColumns = async function(serverid, obj) {
    let queryMiddle = Object.keys(obj).map((key, i) => `${key}=$${i+2}`).join(', ');
    let query = `UPDATE servers SET ${queryMiddle} WHERE serverid=$1 RETURNING *`;
    let server = (await config.pquery(query, [serverid, ...Object.values(obj)]))[0];
    return server;
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

module.exports.toggle = async function(serverid, column) {
    await fetchServer(serverid); // ensure there is a server in the db
    let query = `UPDATE servers SET ${column} = NOT ${column} WHERE serverid=$1 RETURNING ${column}`;
    let res = (await config.pquery(query, [serverid]))[0];
    return res;
}

module.exports.setPrefix = async function(serverid, prefix) {
    await fetchServer(serverid);
    let query = 'UPDATE servers SET prefix=$1 WHERE serverid=$2';
    await config.pquery(query, [prefix, serverid]);
    return;
}

module.exports.fetchCustomFishServers = async function() {
    let query = 'SELECT serverid, custom_fish FROM servers WHERE custom_fish IS NOT NULL';
    let res = await config.pquery(query, []);
    return res;
}

module.exports.setCustomFishCommand = async function(serverid, customFishCommand) {
    let query = 'UPDATE servers SET custom_fish=$1 WHERE serverid=$2';
    await config.pquery(query, [customFishCommand, serverid]);
    return;
}

module.exports.removeCustomFishCommand = async function(serverid) {
    let query = 'UPDATE servers SET custom_fish=NULL WHERE serverid=$1';
    await config.pquery(query, [serverid]);
    return;
}

module.exports.exists = async function(serverid) {
    let query = 'SELECT id FROM servers WHERE serverid=$1';
    let res = await config.pquery(query, [serverid]);
    return !!res[0];
}