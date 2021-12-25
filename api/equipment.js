// Supply Equipment Data Information
// # ----------------------------- #

const EquipmentData = require('./data/equipment.json');
const RingData = require('./data/rings.json');

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