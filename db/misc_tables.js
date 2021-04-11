const config = require('./config.js');

function parseForIntegers(obj) {
    obj.start_time = parseInt(obj.start_time);
    obj.end_time = parseInt(obj.end_time);
    return obj;
}

module.exports.baitshop = {};

module.exports.baitshop.getLatestEntry = async function() {
    let query = 'SELECT * FROM bait_shop ORDER BY end_time DESC LIMIT 1';
    let entry = (await config.pquery(query))[0];
    return parseForIntegers(entry);
}

module.exports.baitshop.insertEntry = async function(o) {
    let query = 'INSERT INTO bait_shop (start_time, end_time, option_1, price_1, qt_1, option_2, price_2, qt_2, option_3, price_3, qt_3, date_string) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)';
    await config.pquery(query, [o.start_time, o.end_time, o.option_1, o.price_1, o.qt_1, o.option_2, o.price_2, o.qt_2, o.option_3, o.price_3, o.qt_3, o.date_string]);
    return;
}

module.exports.baitshop.getCurrentEntry = async function() {
    let query = 'SELECT * FROM bait_shop WHERE start_time <= $1 AND end_time > $1';
    let entry = (await config.pquery(query, [Date.now()]))[0];
    return entry;
}


module.exports.bounty = {};

module.exports.bounty.getLatestEntry = async function() {
    let query = 'SELECT * FROM bounty ORDER BY end_time DESC LIMIT 1';
    let entry = (await config.pquery(query))[0];
    return parseForIntegers(entry);
}

module.exports.bounty.insertEntry = async function(o) {
    let query = 'INSERT INTO bounty (start_time, end_time, fish, tier, reward, date_string) VALUES ($1, $2, $3, $4, $5, $6)';
    await config.pquery(query, [o.start_time, o.end_time, o.fish, o.tier, o.reward, o.date_string]);
}

module.exports.bounty.getCurrentEntry = async function() {
    let query = 'SELECT * FROM bounty WHERE start_time <= $1 AND end_time > $1';
    let entry = (await config.pquery(query, [Date.now()]))[0];
    return parseForIntegers(entry);
}

module.exports.bounty.incrementCompleted = async function(bountyid) {
    let query = 'UPDATE bounty SET completed=completed+1 WHERE id=$1';
    await config.pquery(query, [bountyid]);
    return;
}