// General Dependencies
const Datetime = require('../lib/misc/datetime.js');
// Program

const config = require('./config.js');

module.exports.fetchUser = async function(userid) {
    let query = 'SELECT * FROM users WHERE userid=$1';
    let user = (await config.pquery(query, [userid]))[0];
    if(user) {
        user.cooldown = parseInt(user.cooldown)
        for(let i=1; i<=5; i++) {
            user[`last_collected_${i}`] = parseInt(user[`last_collected_${i}`]) || 0;
        }
    }
    return user;
}

module.exports.initializeAccount = async function(userid, cb) {
    let dateStr = Datetime.getDateAsString();
    let query = 'INSERT INTO users (userid, date_joined, last_collected_1) VALUES ($1, $2, $3)';
    await config.pquery(query, [userid, dateStr, Date.now()]);
    query = 'INSERT INTO aquarium (userid) VALUES ($1)';
    await config.pquery(query, [userid]);
    query = 'INSERT INTO stats (userid) VALUES ($1)';
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

module.exports.collectAquariumEarnings = async function(userid, amountCollected, locationID) {
    let query = `UPDATE users SET coins=coins+$1, last_collected_${locationID}=$2 WHERE userid=$3`;
    await config.pquery(query, [amountCollected, Date.now(), userid]);
    return;
}

module.exports.buyUpgrade = async function(userid, selection, price) {
    let query = `UPDATE users SET ${selection}=${selection}+1, coins=coins-$1 WHERE userid=$2`;
    await config.pquery(query, [price, userid]);
    return;
}

module.exports.setLocation = async function(userid, locationID) {
    let query = 'UPDATE users SET location=$1 WHERE userid=$2';
    await config.pquery(query, [locationID, userid]);
    return;
}