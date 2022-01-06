const config = require('./config.js');

module.exports.setEvent = async function(eventInput) {
    let query = `INSERT INTO events (type, params, start_time, end_time, description, create_time) VALUES ($1, $2, $3, $4, $5, $6)`;
    await config.pquery(query, Object.values(eventInput));
    return;
}

module.exports.getUpcomingEvent = async function() {
    let query = 'SELECT * FROM events WHERE end_time > $1 ORDER BY id DESC LIMIT 1'; // grabs the latest event entry that hasnt passed yet
    let eventEntry = (await config.pquery(query, [Date.now()]))[0];
    if (eventEntry) {
        eventEntry.start_time = parseInt(eventEntry.start_time);
        eventEntry.end_time = parseInt(eventEntry.end_time);
    }
    return eventEntry;
}

module.exports.getCurrentEvent = async function() {
    let query = 'SELECT * FROM events WHERE start_time <= $1 AND end_time >= $1 ORDER BY id DESC LIMIT 1';
    let eventEntry = (await config.pquery(query, [Date.now()]))[0];
    if (eventEntry) {
        eventEntry.start_time = parseInt(eventEntry.start_time);
        eventEntry.end_time = parseInt(eventEntry.end_time);
    }
    return eventEntry;
}