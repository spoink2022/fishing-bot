const FishingLocationsData = require('./data/fishing-locations.json');
const FishData = require('./data/fish.json');


module.exports.getLocationData = function(id) {
    return FishingLocationsData[id];
}

module.exports.getFishData = function(id) {
    return FishData[id-1];
}