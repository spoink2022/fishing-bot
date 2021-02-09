const FishingLocationsData = require('./data/fishing-locations.json');
const FishData = require('./data/fish.json');
const EquipmentData = require('./data/equipment.json');

const FishNameMap = {};
for(const[key, val] of FishData.entries()) {
    FishNameMap[val.name.replace(' ', '_')] = key;
}

module.exports.mapFishNameToID = function(fishName) {
    return FishNameMap[fishName];
}


module.exports.getLocationData = function(id) {
    return FishingLocationsData[id];
}

// fish.json
module.exports.getFishData = function(id) {
    return FishData[id];
}
module.exports.getFishNames = function() {
    return FishData.map(obj => obj.name);
} 

// equipment.json
module.exports.getRodData = function(id) {
    return EquipmentData.rods[id];
}
module.exports.getRodIDs = function() {
    return EquipmentData.rods.map(obj => obj.id);
}

module.exports.getHookData = function(id) {
    return EquipmentData.hooks[id];
}
module.exports.getHookIDs = function() {
    return EquipmentData.hooks.map(obj => obj.id);
}

module.exports.getLineData = function(id) {
    return EquipmentData.lines[id];
}