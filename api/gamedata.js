const AquariumData = require('./data/aquarium.json');

module.exports.getAquariumInfo = function(id) {
    return AquariumData[id];
}

module.exports.getAquariumLabels = function() { // ['aquarium_shabby', 'aquarium_standard', etc.]
    return AquariumData.map(obj => `aquarium_${obj.name.replace(/ /g, '_')}`);
}

module.exports.getAquariumNames = function() { // ['shabby', 'standard', etc.]
    return AquariumData.map(obj => obj.name);
}

module.exports.getAllAquariumData = function() {
    return AquariumData;
}

// gets highest aquarium ID a user can view info about
module.exports.getHighestAquariumID = function(level) {
    const categoryLen = AquariumData.length;
    for(let i=0; i<categoryLen; i++) {
        if(AquariumData[i].level > level) {
            return i;
        }
    }
    return categoryLen-1;
}