// Provides Aquarium Data Information
// # ------------------------------ #

const AquariumData = require('./data/aquarium.json');

module.exports.getAquariumData = function(aquariumId) {
    return AquariumData[aquariumId];
}