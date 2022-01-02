// Provides Aquarium Data Information
// # ------------------------------ #

const AquariumData = require('./data/aquarium.json');

module.exports.getAquariumData = function(aquariumId) {
    return AquariumData[aquariumId];
}

module.exports.getViewableAquariumData = function(maxId) {
    return AquariumData.slice(0, maxId + 1);
}