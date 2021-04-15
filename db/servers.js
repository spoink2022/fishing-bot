const config = require('./config.js');

async function createServerEntry(serverid) {
    let query = 'INSERT INTO servers (serverid) VALUES ($1)';
    await config.pquery(query, [serverid]);
    return;
}

async function fetchServer(serverid) {
    let query = 'SELECT * FROM servers WHERE serverid=$1';
    let res = (await config.pquery(query, [serverid]))[0];
    if (!res) {
        await createServerEntry(serverid);
        res = { promote: false };
    }
    return res;
}

module.exports.fetchServer = fetchServer;

module.exports.toggle = async function(serverid, column) {
    await fetchServer(serverid); // ensure there is a server in the db
    let query = `UPDATE servers SET ${column} = NOT ${column} WHERE serverid=$1 RETURNING ${column}`;
    let res = (await config.pquery(query, [serverid]))[0];
    return res;
}