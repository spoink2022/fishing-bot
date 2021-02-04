// General Dependencies
const Datetime = require('../lib/misc/datetime.js');
// Program

const config = require('./config.js');

module.exports.fetchUser = async function(userid) {
    let query = 'SELECT * FROM users WHERE userid=$1';
    let user = (await config.pquery(query, [userid]))[0];
    return user;
}

module.exports.initializeAccount = async function(userid, cb) {
    let dateStr = Datetime.getDateAsString();
    let query = 'INSERT INTO users (userid, date_joined) VALUES ($1, $2)';
    await config.pquery(query, [userid, dateStr]);
    query = 'INSERT INTO fishing (userid) VALUES ($1)';
    await config.pquery(query, [userid]);
    query = 'INSERT INTO aquarium (userid) VALUES ($1)';
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