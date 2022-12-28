// Handle Game Logic (Misc)
// # -------------------- #
const api = require('../../api');

const BAIT_TYPE_TO_COLOR = {
    bug: 'yellow',
    meat: 'red',
    fish: 'blue',
    shellfish: 'white'
};

module.exports.getChumResult = function(baits) {
    let BaitDatas = [];
    for (let baitName of baits) {
        BaitDatas.push(api.bait.getBaitData(baitName));
    }
    let total = 0;
    let baitTotals = { bug: 0, meat: 0, fish: 0, shellfish: 0 };

    for (let BaitData of BaitDatas) {
        if (BaitData.class) {
            baitTotals[BaitData.class] += BaitData.value;
        }
        total += BaitData.value * 10;
    }

    let dominant = 'bug';
    for (const [key, value] of Object.entries(baitTotals)) {
        if (value > baitTotals[dominant]) {
            dominant = key;
        }
    }

    let chumValue = Math.round(total / 4);

    let result = '';
    if (chumValue < 20) { result = 'cheap_COLOR_chum'; }
    else if (chumValue < 40) { result = 'COLOR_chum'; }
    else if (chumValue < 80) { result = 'spiked_COLOR_chum'; }
    else if (chumValue < 160) { result = 'ultimate_COLOR_chum'; }
    else if (chumValue < 240) { result = 'silver_chum'; }
    else if (chumValue < 320) { result = 'gold_chum'; }
    else { result = 'diamond_chum'; }

    result = result.replace('COLOR', BAIT_TYPE_TO_COLOR[dominant]);
    return result;
}