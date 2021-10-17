let CosmeticData = require('./data/cosmetics.json');

module.exports.getAllEquipmentSkins = function() {
    return CosmeticData.equipment_banner;
}

module.exports.getAllCosmeticData = function() {
    return CosmeticData;
}

module.exports.getCategoryData = function(category) {
    return CosmeticData[category];
}