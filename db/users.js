// General Dependencies
const Datetime = require('../lib/misc/datetime.js');
const { parseQuestString } = require('../lib/misc/str_functions.js');
// Program

const config = require('./config.js');

module.exports.fetchUser = async function(userid) {
    let query = 'SELECT * FROM users WHERE userid=$1';
    let user = (await config.pquery(query, [userid]))[0];
    if(user) {
        user.cooldown = parseInt(user.cooldown)
        if(user.next_vote) { user.next_vote = parseInt(user.next_vote); }
        for(let i=1; i<=5; i++) {
            user[`last_collected_${i}`] = parseInt(user[`last_collected_${i}`]) || 0;
        }
        if(user.quest) { user.quest = parseQuestString(user.quest); }
    }
    return user;
}

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

module.exports.resetFishingCooldown = async function(userid) {
    let query = 'UPDATE users SET cooldown=$1 WHERE userid=$2';
    await config.pquery(query, [Date.now(), userid]);
    return;
}

module.exports.removeFishingCooldown = async function(userid) { // also logs vote timestamp
    let query = 'UPDATE users SET cooldown=0, next_vote=$1 WHERE userid=$2';
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