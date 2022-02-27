// Provide Bait Information to Program
// # ------------------------------- #

const BaitData = require('./data/bait.json');

// Formatted Data
const BaitNames = Object.keys(BaitData);
let BaitNamesByStars = {};
for (const [key, value] of Object.entries(BaitData)) {
    if (value.banned) { continue; }
    if (!(value.stars in BaitNamesByStars)) {
        BaitNamesByStars[value.stars] = [key]
    } else {
        BaitNamesByStars[value.stars].push(key);
    }
}

// Exports
module.exports.getBaitData = function(baitName) {
    return BaitData[baitName];
}

module.exports.getAllBaitNames = function() {
    return BaitNames;
}

module.exports.getAllBaitData = function() {
    return BaitData;
}

module.exports.getBaitNamesByStars = function(stars) {
    return BaitNamesByStars[stars];
}

module.exports.getRegularBaitNames = function() {
    return BaitNames.filter(bait => !BaitData[bait].banned && BaitData[bait].stars <= 3);
}

module.exports.getPremiumBaitNames = function() {
    return BaitNames.filter(bait => !BaitData[bait].banned && BaitData[bait].stars >= 4);
}

module.exports.getBaitDataById = function(baitId) {
    return BaitData[BaitNames[baitId]];
}

module.exports.getBaitNameById = function(baitId) {
    return BaitNames[baitId];
}