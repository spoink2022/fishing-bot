const AquariumData = require('./data/aquarium.json');

module.exports.getAquariumInfo = function(id) {
    return AquariumData[id.toString()];
}