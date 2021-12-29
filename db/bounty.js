const config = require('./config.js');

const logic = require('../lib/logic');

module.exports.getCurrentEntry = async function() {
    let query = 'SELECT * FROM bounty WHERE start_time <= $1 AND end_time > $1';
    let entry = (await config.pquery(query, [Date.now()]))[0];
    if (!entry) { entry = await generateBounty(); }
    return entry;
}

async function insertEntries(entryArr) {
    let query = `INSERT INTO bounty (start_time, end_time, date_string, fish, tier, reward) VALUES ${entryArr.map(o => `(${Object.values(o).join(', ').replace(/"/g, "'")})`).join(', ')}`;
    return await config.pquery(query);
}

async function getLatestEntry() {
    let query = 'SELECT * FROM bounty ORDER BY end_time DESC LIMIT 1';
    let entry = (await config.pquery(query))[0];
    return entry;
}

async function generateBounty() {
    // Generates bounty entries until up-to-date, returning current entry
    const BONUS = 3; // bonus entries to generate

    const latestEntry = await getLatestEntry();
    const toGenerate = Math.floor((Date.now() - parseInt(latestEntry.start_time))/604800000) + BONUS;

    let entryArr = [];
    for (let i=0; i<toGenerate; i++) {
        let entry = logic.generation.generateBounty(parseInt(latestEntry.end_time) + 604800000*i);
        entryArr.push(entry);
    }

    insertEntries(entryArr);
    let entry = entryArr[toGenerate - 1 - BONUS];
    Object.keys(entry).forEach(key => entry[key] = JSON.parse(entry[key]))
    entry.completed = 0;
    return entry;
}