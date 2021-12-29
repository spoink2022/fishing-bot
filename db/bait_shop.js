const config = require('./config.js');

const logic = require('../lib/logic');

module.exports.getCurrentEntry = async function() {
    let query = 'SELECT * FROM bait_shop WHERE start_time <= $1 AND end_time > $1';
    let entry = (await config.pquery(query, [Date.now()]))[0];
    if (!entry) { entry = await generateBaitShop(); }
    return entry;
}

async function insertEntries(entryArr) {
    let query = `INSERT INTO bait_shop (start_time, end_time, date_string, option_1, qt_1, price_1, option_2, qt_2, price_2, option_3, qt_3, price_3) VALUES ${entryArr.map(o => `(${Object.values(o).join(', ').replace(/"/g, "'")})`).join(', ')}`;
    return await config.pquery(query);
}

async function getLatestEntry() {
    let query = 'SELECT * FROM bait_shop ORDER BY end_time DESC LIMIT 1';
    let entry = (await config.pquery(query))[0];
    return entry;
}

async function generateBaitShop() {
    // Generates baitshop entries until up-to-date
    const latestEntry = await getLatestEntry();
    const toGenerate = Math.floor((Date.now() - parseInt(latestEntry.start_time))/86400000);

    let entry;
    let entryArr = [];
    for (let i=0; i<toGenerate; i++) {
        entry = logic.generation.generateBaitShop(parseInt(latestEntry.end_time) + 86400000*i);
        entryArr.push(entry);
    }

    insertEntries(entryArr);
    return entry;
}