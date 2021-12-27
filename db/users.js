// General Dependencies
const Datetime = require('../lib/misc/datetime.js');
const { parseQuestString } = require('../lib/misc/str_functions.js');
// Program

const config = require('./config.js');


// NEW -- START
module.exports.fetchUser = async function(userid) {
    let query = 'SELECT * FROM users WHERE userid=$1';
    let user = (await config.pquery(query, [userid]))[0];
    if (!user) { // initialize user
        query = 'INSERT INTO users (userid) VALUES ($1) returning *';
        user = (await config.pquery(query, [userid]))[0];
        query = 'INSERT INTO aquarium (userid) VALUES ($1)';
        await config.pquery(query, [userid]);
        query = 'INSERT INTO inventory (userid) VALUES ($1)';
        await config.pquery(query, [userid]);
    }
    return user;
}

module.exports.updateColumns = async function(userid, obj) {
    let queryMiddle = Object.keys(obj).map(key => `${key}=${key}+${obj[key]}`).join(', ');
    let query = `UPDATE users SET ${queryMiddle} WHERE userid=$1`;
    return await config.pquery(query, [userid]);
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

// NEW -- END



module.exports.fetchInventory = async function(userid) {
    let query = 'SELECT * FROM inventory WHERE userid=$1';
    let inventory = (await config.pquery(query, [userid]))[0];
    for (const [key, value] of Object.entries(inventory)) {
        if (key.includes('_')) {
            inventory[key.replace(/_/g, ' ')] = value;
        }
    }
    return inventory;
}

module.exports.updateInventory = async function(userid, column, amount) {
    column = column.replace(/ /g, '_');
    let query = `UPDATE inventory SET ${column}=${column}+$1 WHERE userid=$2`;
    await config.pquery(query, [amount, userid]);
    return;
}

module.exports.initializeAccount = async function(userid, cb) {
    let dateStr = Datetime.getDateAsString();
    let query = 'INSERT INTO users (userid, date_joined, last_collected_1) VALUES ($1, $2, $3)';
    await config.pquery(query, [userid, dateStr, Date.now()]);
    query = 'INSERT INTO aquarium (userid) VALUES ($1)';
    await config.pquery(query, [userid]);
    query = 'INSERT INTO stats (userid) VALUES ($1)';
    await config.pquery(query, [userid]);
    query = 'INSERT INTO inventory (userid) VALUES ($1)';
    await config.pquery(query, [userid]);
    cb();
}

// game-unique functions
module.exports.creditCoinsAndExp = async function(userid, coinsToAdd, expToAdd) {
    let query = 'UPDATE users SET coins=coins+$1, exp=exp+$2 WHERE userid=$3 RETURNING exp';
    let updatedExp = (await config.pquery(query, [coinsToAdd, expToAdd, userid]))[0].exp;
    return updatedExp;
}

module.exports.incrementLevel = async function(userid, expToSubtract) {
    let query = 'UPDATE users SET level=level+1, exp=exp-$1 WHERE userid=$2';
    await config.pquery(query, [expToSubtract, userid]);
}

module.exports.resetFishingCooldown = async function(userid, chargeback) {
    let query = 'UPDATE users SET cooldown=$1 WHERE userid=$2';
    await config.pquery(query, [Date.now() - chargeback, userid]);
    return;
}

module.exports.removeFishingCooldown = async function(userid, rodCooldown) { // also logs vote timestamp
    let query = `UPDATE users SET cooldown=cooldown-${rodCooldown}, next_vote=$1 WHERE userid=$2`;
    await config.pquery(query, [Date.now()+1000*60*60*12, userid]);
    return;
}

module.exports.collectAquariumEarnings = async function(userid, amountCollected, locationID) {
    let query = `UPDATE users SET coins=coins+$1, last_collected_${locationID}=$2 WHERE userid=$3`;
    await config.pquery(query, [amountCollected, Date.now(), userid]);
    return;
}

module.exports.collectAllAquariumEarnings = async function(userid, amountCollected, locationIDs) {
    let queryMiddle = locationIDs.map(num => `last_collected_${num}=$2`).join(',');
    let query = `UPDATE users SET coins=coins+$1,${queryMiddle} WHERE userid=$3`;
    await config.pquery(query, [amountCollected, Date.now(), userid]);
    return;
}

module.exports.buyUpgrade = async function(userid, selection, price) {
    let query = `UPDATE users SET ${selection}=${selection}+1, coins=coins-$1 WHERE userid=$2`;
    await config.pquery(query, [price, userid]);
    return;
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

module.exports.setLocation = async function(userid, locationID) {
    let query = 'UPDATE users SET location=$1 WHERE userid=$2';
    await config.pquery(query, [locationID, userid]);
    return;
}

module.exports.updateQuest = async function(userid, questString) {
    let query = 'UPDATE users SET quest=$1 WHERE userid=$2';
    await config.pquery(query, [questString, userid]);
    return;
}

module.exports.deleteQuest = async function(userid) {
    let query = 'UPDATE users SET quest=NULL WHERE userid=$1';
    await config.pquery(query, [userid]);
    return;
}

module.exports.handleQuestCollect = async function(userid, reward) {
    let query = 'UPDATE users SET quest=NULL, lollipops=lollipops+$1 WHERE userid=$2';
    await config.pquery(query, [reward, userid]);
    return;
}

module.exports.claimBounty = async function(userid, bountyid, bountyAmount) {
    let query = 'UPDATE users SET bounty=$1, lollipops=lollipops+$2 WHERE userid=$3';
    await config.pquery(query, [bountyid, bountyAmount, userid]);
    return;
}

// BULK USER QUERIES
module.exports.fetchLevels = async function(useridArray) {
    let query = 'SELECT userid, level, exp, cooldown FROM users WHERE userid=ANY($1)';
    let res = await config.pquery(query, [useridArray]);
    return res;
}

module.exports.updateArrayOfColumns = async function(useridArray, columnName, value) {
    let query = `UPDATE users SET ${columnName}=${columnName}+$1 WHERE userid=ANY($2)`;
    await config.pquery(query, [value, useridArray]);
    return;
}

// PURCHASES TABLE
async function ensurePurchasesEntry(userid) {
    let query = 'SELECT * FROM purchases WHERE userid=$1 LIMIT 1';
    let purchases = await config.pquery(query, [userid]);
    if (!purchases[0]) {
        query = 'INSERT INTO purchases (userid) VALUES ($1)';
        await config.pquery(query, [userid]);
    }
    return true;
}

module.exports.getPurchases = async function(userid) {
    let query = 'SELECT * FROM purchases WHERE userid=$1 LIMIT 1';
    let res = await config.pquery(query, [userid]);
    return res[0];
}

module.exports.decrementCustomFish = async function(userid) {
    let query = 'UPDATE purchases SET custom_fish=custom_fish-1 WHERE userid=$1 RETURNING custom_fish';
    let res = await config.pquery(query, [userid]);
    return res[0].custom_fish;
}

module.exports.updatePurchasesColumn = async function(userid, columnName, value) {
    let tmp = await ensurePurchasesEntry(userid);
    let query = `UPDATE purchases SET ${columnName}=${columnName}+$1 WHERE userid=$2`;
    await config.pquery(query, [value, userid]);
    return;
}

