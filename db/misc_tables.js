const api = require('../api');
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

module.exports.daily = {};
module.exports.daily.getLatestEntry = async function() {
    let query = 'SELECT * FROM daily ORDER BY end_time DESC LIMIT 1';
    let entry = (await config.pquery(query))[0];
    return parseForIntegers(entry);
}
module.exports.daily.insertEntry = async function(o) {
    let weather_identifiers = [], weather_vars = [], weather_choices = [];
    const WEATHER_REPS = api.fishing.getLocationDatasetLength();
    for (let i=1; i<=WEATHER_REPS; i++) {
        weather_identifiers.push(`weather_${i}`);
        weather_vars.push(`$${i+3}`);
    }
    let query = `INSERT INTO daily (start_time, end_time, date_string, ${weather_identifiers.join(', ')}) VALUES ($1, $2, $3, ${weather_vars.join(', ')})`;

    await config.pquery(query, [o.start_time, o.end_time, o.date_string, ...o.weather]);
}
module.exports.daily.getCurrentEntry = async function() {
    let query = 'SELECT * FROM daily WHERE start_time <= $1 AND end_time > $1';
    let entry = (await config.pquery(query, [Date.now()]))[0];
    return parseForIntegers(entry);
}

module.exports.cards = {};
module.exports.cards.insertEntry = async function(c) {
    let query = 'INSERT INTO cards (userid, fish, r, grade) VALUES ($1, $2, $3, $4) RETURNING id';
    let cardID = (await config.pquery(query, [c.userid, c.fish, c.r, c.grade]))[0].id;
    return cardID;
}
module.exports.cards.removeEntry = async function(cardID) {
    let query = 'DELETE FROM cards WHERE id=$1';
    await config.pquery(query, [cardID]);
}
module.exports.cards.getEntryCount = async function(userid) {
    let query = 'SELECT COUNT(id) FROM cards WHERE userid=$1';
    let entryCount = await config.pquery(query, [userid]);
    return entryCount[0].count;
}
module.exports.cards.getAllEntries = async function(userid) {
    let query = 'SELECT id, fish, r, grade FROM cards WHERE userid=$1 ORDER BY id';
    let cards = await config.pquery(query, [userid]);
    return cards;
}
module.exports.cards.getCardData = async function(cardID) {
    let query = 'SELECT * FROM cards WHERE id=$1';
    let card = (await config.pquery(query, [cardID]))[0];
    return card;
}
module.exports.cards.changeOwner = async function(cardID, newUserid) {
    let query = 'UPDATE cards SET userid=$1 WHERE id=$2';
    await config.pquery(query, [newUserid, cardID]);
}