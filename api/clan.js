// Provides Data on Clans
// # ------=----------- #

const ClanShopData = require('./data/clanshop.json');

module.exports.getPerkValue = function(name, level) {
    return ClanShopData.perks[name].levels[level-1].value;
}

module.exports.getAllClanShopData = function() {
    return ClanShopData;
}