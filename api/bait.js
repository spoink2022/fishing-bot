// Provide Bait Information to Program
// # ------------------------------- #

const AllBaitData = require('./data/bait.json');
const RegularBaitData = AllBaitData.regular;
const ChumBaitData = AllBaitData.chum;

// Formatted Data
const BaitNames = Object.keys(RegularBaitData);
let BaitNamesByStars = {};
for (const [key, value] of Object.entries(RegularBaitData)) {
    if (value.banned) { continue; }
    if (!(value.stars in BaitNamesByStars)) {
        BaitNamesByStars[value.stars] = [key]
    } else {
        BaitNamesByStars[value.stars].push(key);
    }
}

const ChumBaitNames = Object.keys(ChumBaitData);

// Exports (Regular)
module.exports.getBaitData = function(baitName) {
    return RegularBaitData[baitName];
}

module.exports.getAllBaitNames = function() {
    return BaitNames;
}

module.exports.getAllBaitData = function() {
    return RegularBaitData;
}

module.exports.getBaitNamesByStars = function(stars) {
    return BaitNamesByStars[stars];
}

module.exports.getRegularBaitNames = function() {
    return BaitNames.filter(bait => !RegularBaitData[bait].banned && RegularBaitData[bait].stars <= 3);
}

module.exports.getPremiumBaitNames = function() {
    return BaitNames.filter(bait => !RegularBaitData[bait].banned && RegularBaitData[bait].stars >= 4);
}

module.exports.getBaitDataById = function(baitId) {
    return RegularBaitData[BaitNames[baitId]];
}

module.exports.getBaitNameById = function(baitId) {
    return BaitNames[baitId];
}

// Exports (Chum)
module.exports.getChumBaitData = function(baitName) {
    return ChumBaitData[baitName];
}

module.exports.getAllChumBaitNames = function() {
    return ChumBaitNames;
}

module.exports.getAllChumBaitData = function() {
    return ChumBaitData;
}