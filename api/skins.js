const CosmeticData = require('./data/cosmetics.json');

module.exports.getAllSkinData = function() {
    return CosmeticData;
}

module.exports.getCategoryData = function(category) {
    return CosmeticData[category];
}

module.exports.getSkinData = function(category, cosmeticId) {
    return CosmeticData[category].contents[cosmeticId];
}

module.exports.getCategoryNames = function() {
    return Object.keys(CosmeticData);
}