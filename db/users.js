const config = require('./config.js');

// NEW -- START
module.exports.fetchUser = async function(userid) {
    let query = 'SELECT * FROM users WHERE userid=$1';
    let user = (await config.pquery(query, [userid]))[0];
    if (!user) { // initialize user
        query = 'INSERT INTO users (userid, joined) VALUES ($1, $2) returning *';
        user = (await config.pquery(query, [userid, Date.now()]))[0];
        query = 'INSERT INTO aquarium (userid) VALUES ($1)';
        await config.pquery(query, [userid]);
        query = 'INSERT INTO bait (userid) VALUES ($1)';
        await config.pquery(query, [userid]);
        query = 'INSERT INTO scores (userid) VALUES ($1)';
        await config.pquery(query, [userid]);
    }
    return user;
}

module.exports.updateColumns = async function(userid, obj) {
    let queryMiddle = Object.keys(obj).map(key => `${key}=${key}+${obj[key]}`).join(', ');
    let query = `UPDATE users SET ${queryMiddle} WHERE userid=$1`;
    return await config.pquery(query, [userid]);
}

module.exports.updateColumnsBulk = async function(useridArray, obj) {
    let queryMiddle = Object.keys(obj).map(key => `${key}=${key}+${obj[key]}`).join(', ');
    let query = `UPDATE users SET ${queryMiddle} WHERE userid=ANY($1)`;
    return await config.pquery(query, [useridArray]);
}

module.exports.setColumns = async function(userid, obj) {
    let queryMiddle = Object.keys(obj).map(key => `${key}=${obj[key]}`).join(', ');
    let query = `UPDATE users SET ${queryMiddle} WHERE userid=$1`;
    return await config.pquery(query, [userid]);
}

module.exports.updateColumn = async function(userid, column, amount) {
    let query = `UPDATE users SET ${column}=${column}+$1 WHERE userid=$2`;
    await config.pquery(query, [amount, userid]);
    return;
}

module.exports.setColumn = async function(userid, column, setValue) {
    let query = `UPDATE users SET ${column}=$1 WHERE userid=$2`;
    await config.pquery(query, [setValue, userid]);
    return;
}

module.exports.addAnnexedServer = async function(userid, serverid) {
    let query = 'UPDATE users SET annexed_servers=ARRAY_APPEND(annexed_servers, $1) WHERE userid=$2';
    return await config.pquery(query, [serverid, userid]);
}

module.exports.appendToShopServers = async function(userid, serverid) {
    let query = 'UPDATE users SET shop_servers=ARRAY_APPEND(shop_servers, $1) WHERE userid=$2';
    return await config.pquery(query, [serverid, userid]);
}

module.exports.resetShopServers = async function(userid, epochWeek) {
    let query = 'UPDATE users SET shop_week=$1, shop_servers=ARRAY[]::BIGINT[] WHERE userid=$2';
    return await config.pquery(query, [epochWeek, userid]);
}

module.exports.handleAquariumCollect = async function(userid, coinsCollected, newAquariumCollected) {
    let query = 'UPDATE users SET coins=coins+$1, aquarium_collected=$2 WHERE userid=$3';
    return await config.pquery(query, [coinsCollected, newAquariumCollected, userid]);
}

module.exports.setQuest = async function(userid, quest) {
    let query = 'UPDATE users SET quest_type=$1, quest_progress=0, quest_requirement=$2, quest_data=$3, quest_reward=$4, quest_start=$5 WHERE userid=$6 RETURNING *';
    let user = (await config.pquery(query, [quest.quest_type, quest.quest_requirement, quest.quest_data, quest.quest_reward, Date.now(), userid]))[0];
    return user;
}

module.exports.setQuestProgress = async function(userid, questProgress) {
    let query = 'UPDATE users SET quest_progress=$1 WHERE userid=$2';
    return await config.pquery(query, [questProgress, userid]);
}

module.exports.appendToAquariumCollected = async function(userid, appendArray) {
    let query = 'UPDATE users SET aquarium_collected = aquarium_collected || $1 WHERE userid=$2';
    return await config.pquery(query, [appendArray, userid]);
}

// Summation Functions
module.exports.fetchTotalFishCaught = async function() {
    let query = 'SELECT SUM(fish_caught) FROM users';
    let fishCaught = (await config.pquery(query))[0].sum;
    return fishCaught;
}

module.exports.fetchTotalWeightCaught = async function() {
    let query = 'SELECT SUM(weight_caught) FROM users';
    let weightCaught = (await config.pquery(query))[0].sum / 1000000;
    return weightCaught; // tons
}

module.exports.fetchGlobalDollarsSpent = async function() {
    let query = 'SELECT SUM(all_supporter) AS supporter, SUM(all_big_supporter) AS big_supporter, SUM(all_premium_server) AS premium_server FROM users';
    let d = (await config.pquery(query))[0];
    let dollarsSpent = d.supporter * 1.5 + d.big_supporter * 10 + d.premium_server * 20;
    return dollarsSpent;
}

// Bulk Queries
module.exports.fetchLeaderboardsByWeight = async function(useridArray) {
    let query = 'SELECT userid, weight_caught AS value FROM users WHERE userid=ANY($1) ORDER BY weight_caught DESC LIMIT 20';
    let res = await config.pquery(query, [useridArray]);
    return res;
}

module.exports.fetchLeaderboardsRankByWeight = async function(userid, useridArray) {
    let query = 'SELECT rank, value FROM (SELECT userid, weight_caught AS value, RANK() OVER(ORDER BY weight_caught DESC) rank FROM users WHERE userid=ANY($2)) AS tmp WHERE userid=$1';
    let res = await config.pquery(query, [userid, useridArray]);
    return res[0];
}

// Summation Queries
module.exports.fetchGlobalUserStats = async function() {
    let query = 'SELECT COUNT(id) AS users, SUM(fish_caught) AS fish, SUM(weight_caught) AS grams FROM users';
    let res = (await config.pquery(query))[0];
    return res;
}

// INTERFACING THE server_shop_claims TABLE
module.exports.resetServerShopClaims = async function(userid) {
    let query = 'DELETE FROM server_shop_claims WHERE userid=$1';
    return await config.pquery(query, [userid]);
}

module.exports.getAllServerShopClaims = async function(userid) {
    let query = 'SELECT * FROM server_shop_claims WHERE userid=$1';
    let res = await config.pquery(query, [userid]);
    return res;
}

module.exports.getServerShopClaims = async function(userid, serverid) {
    let query = 'SELECT * FROM server_shop_claims WHERE userid=$1 AND serverid=$2';
    let res = await config.pquery(query, [userid, serverid]);
    return res;
}

module.exports.createServerShopClaim = async function(userid, serverid, deal) {
    let query = 'INSERT INTO server_shop_claims (userid, serverid, deal) VALUES ($1, $2, $3)';
    return await config.pquery(query, [userid, serverid, deal]);
}