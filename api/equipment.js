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
module.exports.getViewableRodData = function(maxId) {
    return EquipmentData.rods.slice(0, maxId + 1);
}
module.exports.getRodNames = function() {
    return EquipmentData.rods.map(obj => obj.name);
}
module.exports.getRodIds = function() {
    return EquipmentData.rods.map(obj => obj.id);
}

module.exports.getLineData = function(id) {
    return EquipmentData.lines[id];
}
module.exports.getViewableLineData = function(maxId) {
    return EquipmentData.lines.slice(0, maxId + 1);
}
module.exports.getLineNames = function() {
    return EquipmentData.lines.map(obj => obj.name);
}

module.exports.getHookData = function(id) {
    return EquipmentData.hooks[id];
}
module.exports.getViewableHookData = function(maxId) {
    return EquipmentData.hooks.slice(0, maxId + 1);
}
module.exports.getHookNames = function() {
    return EquipmentData.hooks.map(obj => obj.name);
}
module.exports.getHookIds = function() {
    return EquipmentData.hooks.map(obj => obj.id);
}

module.exports.getGloveData = function(id) {
    return EquipmentData.gloves[id-1];
}
module.exports.getViewableGloveData = function(maxId) {
    return EquipmentData.gloves.slice(0, maxId + 1);
}
module.exports.getGloveNames = function() {
    return EquipmentData.gloves.map(obj => obj.name);
}
module.exports.getGloveIds = function() {
    return EquipmentData.gloves.map(obj => obj.id);
}


module.exports.getSwivelData = function(id) {
    return EquipmentData.swivels[id-1];
}
module.exports.getViewableSwivelData = function(maxId) {
    return EquipmentData.swivels.slice(0, maxId + 1);
}
module.exports.getSwivelNames = function() {
    return EquipmentData.swivels.map(obj => obj.name);
}
module.exports.getSwivelIds = function() {
    return EquipmentData.swivels.map(obj => obj.id);
}

// Rings
module.exports.getRingData = function(ringType) {
    return RingData.types[ringType];
}

module.exports.getRingPackData = function(userLevel) {
    return RingData.packs.find(element => userLevel < element.maxLevel);
}

module.exports.getRingSellRate = function(rating) {
    return RingData.sellRates[rating];
}

// Rings - Bulk
module.exports.getRingNames = function() {
    return RingNames;
}

module.exports.getRingPackChances = function(packType) {
    return RingData.packChances[`${packType}PrefixSum`];
}

module.exports.getRingTypeData = function() {
    return RingData.types;
}