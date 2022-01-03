// Provides Aquarium Data Information
// # ------------------------------ #

const AquariumData = require('./data/aquarium.json');

// Formatted Data
const AquariumNames = AquariumData.map(obj => obj.name);

module.exports.getAquariumData = function(aquariumId) {
    return AquariumData[aquariumId];
}

module.exports.getViewableAquariumData = function(maxId) {
    return AquariumData.slice(0, maxId + 1);
}

module.exports.getAquariumNames = function() {
    return AquariumNames;
}