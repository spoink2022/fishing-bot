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

// lines
module.exports.getLineData = function(id) {
    return EquipmentData.lines[id];
}
module.exports.getLineNames = function() {
    return EquipmentData.lines.map(obj => obj.name.toLowerCase()+' line');
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