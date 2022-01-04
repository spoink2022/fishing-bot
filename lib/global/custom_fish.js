const db = require('../../db');

let servers = {};

module.exports.hasCustomFish = function(serverid) {
    return serverid in servers;
}

module.exports.getCustomFish = function(serverid) {
    return servers[serverid];
}

module.exports.setCustomFish = async function(serverid, word) {
    servers[serverid] = word;
}