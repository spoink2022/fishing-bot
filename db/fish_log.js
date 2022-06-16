const config = require('./config.js');

const MAX_ENTRIES = 500;

const trimEntries = async function(userid) {
    let query = `DELETE FROM fish_log WHERE id = ANY(SELECT id FROM fish_log WHERE userid=$1 ORDER BY id DESC OFFSET ${MAX_ENTRIES})`;
    return await config.pquery(query, [userid]);
}

const getTimestamp = function() { 
    return Math.floor(Date.now()/1000 - 50*365*24*60*60);
}

module.exports.recordFishEvent = async function(userid) {
    let query = 'INSERT INTO fish_log (userid, timestamp) VALUES ($1, $2)';
    await config.pquery(query, [userid, getTimestamp()]);
    trimEntries(userid);
}