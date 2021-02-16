const FishingLocationsData = require('./data/fishing-locations.json');
const FishData = require('./data/fish.json');
const EquipmentData = require('./data/equipment.json');

const FishNameMap = {};
for(const[key, val] of FishData.entries()) {
    FishNameMap[val.name.replace(/ /g, '_')] = key;
}

module.exports.mapFishNameToID = function(fishName) {
    return FishNameMap[fishName];
}


module.exports.getLocationData = function(id) {
    return FishingLocationsData[id-1];
}
module.exports.getLocationDatasetLength = function() {
    return FishingLocationsData.length;
}
module.exports.getUnlockedLocations = function(level) {
    let unlockedLocations = [];
    for(const obj of FishingLocationsData) {
        if(level >= obj.level) { unlockedLocations.push(obj.id); }
    }
    return unlockedLocations;
}
module.exports.getAllLocationData = function() {
    return FishingLocationsData;
}

// fish.json
module.exports.getFishData = function(id) {
    return FishData[id];
}
module.exports.getFishNames = function() {
    return FishData.map(obj => obj.name);
}

// equipment.json
// rods
module.exports.getRodData = function(id) {
    return EquipmentData.rods[id];
}
module.exports.getRodIDs = function() {
    return EquipmentData.rods.map(obj => obj.id);
}
module.exports.getRodNames = function() {
    return EquipmentData.rods.map(obj => obj.name.toLowerCase()+' rod');
}
module.exports.getAllRodData = function() {
    return EquipmentData.rods;
}

// lines
module.exports.getLineData = function(id) {
    return EquipmentData.lines[id];
}
module.exports.getLineNames = function() {
    return EquipmentData.lines.map(obj => obj.name.toLowerCase()+' line');
}
module.exports.getAllLineData = function() {
    return EquipmentData.lines;
}

// hooks
module.exports.getHookData = function(id) {
    return EquipmentData.hooks[id];
}
module.exports.getHookIDs = function() {
    return EquipmentData.hooks.map(obj => obj.id);
}
module.exports.getHookNames = function() {
    return EquipmentData.hooks.map(obj => obj.name.toLowerCase()+' hook');
}
module.exports.getAllHookData = function() {
    return EquipmentData.hooks;
}

// general
// gets highest item ID user can view info about
module.exports.getHighestItemID = function(category, level) {
    const categoryLen = EquipmentData[category].length;
    for(let i=0; i<categoryLen; i++) {
        if(EquipmentData[category][i].level > level) {
            return i;
        }
    }
    return categoryLen-1;
}