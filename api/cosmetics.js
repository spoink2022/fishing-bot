let CosmeticData = require('./data/cosmetics.json');

module.exports.getAllEquipmentSkins = function() {
    return CosmeticData.equipment_banner;
}