const db = require('../../db');

let serverList = [];
let serverMap = {};

async function updateLocals() { // fetches db info
    console.log('Updating Locals...');
    let servers = await db.servers.fetchCustomFishServers();
    serverMap = servers.reduce((obj, item) => (obj[item.serverid] = item.custom_fish, obj), {});
    serverList = Object.keys(serverMap);
}

module.exports.updateCustomFishLocals = updateLocals;

module.exports.getCustomFishCommand = async function(serverid) {
    return serverMap[serverid];
}

module.exports.hasCustomFishCommand = async function(serverid) {
    return serverList.includes(serverid);
}

updateLocals();