// Provides Equipment Data Information
// # ------------------------------- #

const EquipmentData = require('./data/equipment.json');
const RingData = require('./data/rings.json');

// Formatted Data
RingData.packChances.regularPrefixSum = getPrefixSum(RingData.packChances.regular);
RingData.packChances.premiumPrefixSum = getPrefixSum(RingData.packChances.premium);
const RingNames = Object.keys(RingData.types);

// Formatting Functions
function getPrefixSum(arr) {
    let prefixSum = [];
    for (let i=0; i<arr.length; i++) {
        prefixSum.push(Math.round((arr[i] + (prefixSum[i-1] || 0)) * 10 ) / 10);
    }
    return prefixSum;
}

// Exports

module.exports.getRodData = function(id) {
    return EquipmentData.rods[id];
}

module.exports.getLineData = function(id) {
    return EquipmentData.lines[id];
}

module.exports.getHookData = function(id) {
    return EquipmentData.hooks[id];
}

module.exports.getGloveData = function(id) {
    return EquipmentData.gloves[id-1];
}

module.exports.getRingData = function(ringType) {
    return RingData.types[ringType];
}

module.exports.getSwivelData = function(id) {
    return EquipmentData.swivels[id-1];
}

// Rings
module.exports.getRingPackData = function(userLevel) {
    return RingData.packs.find(element => userLevel < element.maxLevel);
}

module.exports.getRingSellRate = function(rating) {
    return RingData.sellRates[rating];
}

// Rings - Bulk
module.exports.getRingNames = function(ringNames) {
    return RingNames;
}

module.exports.getRingPackChances = function(packType) {
    return RingData.packChances[`${packType}PrefixSum`];
}