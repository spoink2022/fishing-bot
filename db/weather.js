const config = require('./config.js');

const logic = require('../lib/logic');

module.exports.getCurrentEntry = async function() {
    let query = 'SELECT * FROM weather WHERE start_time <= $1 AND end_time > $1';
    let entry = (await config.pquery(query, [Date.now()]))[0];
    if (!entry) { entry = await generateWeather(); }
    return entry;
}

async function insertEntries(entryArr) {
    let query = `INSERT INTO weather (start_time, end_time, date_string, l1, l2, l3, l4, l5, l6, l7, l8, l9, l10, l11, l12, l13) VALUES ${entryArr.map(o => `(${Object.values(o).join(', ').replace(/"/g, "'")})`).join(', ')}`;
    return await config.pquery(query);
}

async function getLatestEntry() {
    let query = 'SELECT * FROM weather ORDER BY end_time DESC LIMIT 1';
    let entry = (await config.pquery(query))[0];
    return entry;
}

async function generateWeather() {
    // Generates weather entries until up-to-date, returning current entry
    const BONUS = 7; // bonus entries to generate

    const latestEntry = await getLatestEntry();
    const toGenerate = Math.floor((Date.now() - parseInt(latestEntry.start_time))/86400000) + BONUS;

    let entryArr = [];
    for (let i=0; i<toGenerate; i++) {
        let entry = logic.generation.generateWeather(parseInt(latestEntry.end_time) + 86400000*i);
        entryArr.push(entry);
    }

    insertEntries(entryArr);
    let entry = entryArr[toGenerate - 1 - BONUS];
    Object.keys(entry).forEach(key => entry[key] = JSON.parse(entry[key]));
    return entry;
}