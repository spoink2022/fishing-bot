const db = require('../../db');

const UPDATE_TIME = (60) * 60000; // (in brackets is minutes)

let serverList = [];
let serverMap = {};

async function updateLocals() { // fetches db info
    let servers = await db.servers.fetchCustomFishServers();
    serverMap = servers.reduce((obj, item) => (obj[item.serverid] = item.custom_fish, obj), {});
    serverList = Object.keys(serverMap);
}

module.exports.getCustomFishCommand = async function(serverid) {
    return serverMap[serverid];
}

module.exports.hasCustomFishCommand = async function(serverid) {
    return serverList.includes(serverid);
}

updateLocals();

setInterval(updateLocals, UPDATE_TIME);