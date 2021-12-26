// Provides Information on Fish and Fishing Locations
// # ---------------------------------------------- #

const FishData = require('./data/fish.json');
const LocationData = require('./data/fishing-locations.json');

module.exports.getFishData = function(fishId) {
    return FishData[fishId];
}

module.exports.getLocationData = function(locationId) {
    return LocationData[locationId-1];
}