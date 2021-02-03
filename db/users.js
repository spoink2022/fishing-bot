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
    cb();
}