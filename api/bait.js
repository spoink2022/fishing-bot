// Provide Bait Information to Program
// # ------------------------------- #

const BaitData = require('./data/bait.json');

// Formatted Data
const BaitNames = Object.keys(BaitData);

// Exports
module.exports.getBaitData = function(baitName) {
    return BaitData[baitName];
}

module.exports.getAllBaitNames = function() {
    return BaitNames;
}

module.exports.getRegularBaitNames = function() {
    return BaitNames.filter(bait => !BaitData[bait].banned);
}

module.exports.getBaitDataById = function(baitId) {
    return BaitData[BaitNames[baitId]];
}

module.exports.getBaitNameById = function(baitId) {
    return BaitNames[baitId];
}