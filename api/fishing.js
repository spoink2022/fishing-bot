const FishingLocationsData = require('./data/fishing-locations.json');
const FishData = require('./data/fish.json');
const EquipmentData = require('./data/equipment.json');


module.exports.getLocationData = function(id) {
    return FishingLocationsData[id];
}

module.exports.getFishData = function(id) {
    return FishData[id-1];
}

module.exports.getRodData = function(id) {
    return EquipmentData.rod[id];
}

module.exports.getAllRodData = function() {
    return EquipmentData.rod;
}

module.exports.getLineData = function(id) {
    return EquipmentData.line[id];
}