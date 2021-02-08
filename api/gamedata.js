const AquariumData = require('./data/aquarium.json');

module.exports.getAquariumInfo = function(id) {
    return AquariumData[id.toString()];
}

module.exports.getAquariumLabels = function() {
    let labels =  {};
    for(const val of Object.values(AquariumData)) {
        labels[val.name] = val.label;
    }
    return labels;
}