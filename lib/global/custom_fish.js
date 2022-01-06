const db = require('../../db');

let servers = {};

module.exports.registerCustomFishCommands = async function() {
    const customFishServers = await db.servers.fetchCustomFishServers();
    for (let entry of customFishServers) {
        let guild;
        try {
            guild = await client.guilds.fetch(entry.serverid);
        } catch {
            continue;
        }
        if (guild.available) { // only this shard
            servers[entry.serverid] = entry.custom_fish;
        }
    }
    console.log(servers);
}

module.exports.hasCustomFish = function(serverid) {
    return serverid in servers;
}

module.exports.getCustomFish = function(serverid) {
    return servers[serverid];
}

module.exports.setCustomFish = async function(serverid, word) {
    servers[serverid] = word;
}