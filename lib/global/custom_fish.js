const db = require('../../db');

let serverList = [];
let serverMap = {};

async function pullLocals() { // fetches db info
    console.log('Pulling Locals...');
    let servers = await db.servers.fetchCustomFishServers();
    serverMap = servers.reduce((obj, item) => (obj[item.serverid] = item.custom_fish, obj), {});
    serverList = Object.keys(serverMap);
}

module.exports.pullCustomFishLocals = pullLocals;

module.exports.getCustomFishCommand = async function(serverid) {
    return serverMap[serverid];
}

module.exports.hasCustomFishCommand = async function(serverid) {
    return serverList.includes(serverid);
}

module.exports.updateCustomFishLocals = async function(serverid, alias) {
    if (serverList.includes(serverid)) {
        serverMap[serverid] = alias;
    } else {
        serverMap[serverid] = alias;
        serverList.push(serverid);
    }
}

module.exports.removeFromCustomFishLocals = async function(serverid) {
    let index = serverList.indexOf(serverid);
    if (index > -1) { serverList.splice(index, 1); }
    delete serverMap[serverid];
}

pullLocals();