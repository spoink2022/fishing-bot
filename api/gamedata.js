const AquariumData = require('./data/aquarium.json');

module.exports.getAquariumInfo = function(id) {
    return AquariumData[id];
}

module.exports.getAquariumLabels = function() { // ['aquarium_shabby', 'aquarium_standard', etc.]
    return AquariumData.map(obj => `aquarium_${obj.name.replace(' ', '_')}`);
}

module.exports.getAquariumNames = function() { // ['shabby', 'standard', etc.]
    return AquariumData.map(obj => obj.name);
}