let CosmeticData = require('./data/cosmetics.json');

module.exports.getAllCosmeticFiles = function() {
    return CosmeticData.banners;
}