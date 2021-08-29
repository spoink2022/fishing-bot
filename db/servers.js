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