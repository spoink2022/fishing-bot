const db = require('../../db');

let servers = {};

module.exports.setCustomFish = async function(serverid, word) {
    servers[serverid] = word;
}