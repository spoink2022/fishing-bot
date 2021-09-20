const config = require('../static/private/config.json');

let path = 'https://storage.googleapis.com/fishingbot/assets';
if (config.DEV) {
    path = 'https://raw.githubusercontent.com/spoink2022/fishing-bot/main/static/img';
    console.log('new path');
}

module.exports.fetchFishImgUrl = function(fishName) {
    fishName = fishName.replace(/ /g, '_');
    return `${path}/fish/${fishName}.png`;
}

module.exports.fetchAssetUrl = function(asset) {
    return `${path}/misc/${asset}.png`;
}

module.exports.fetchCosmeticUrl = function(cosmetic) {
    return `${path}/cosmetics/${cosmetic}.png`;
}

module.exports.fetchBackgroundUrl = function(key) {
    return `${path}/background/${key}.png`;
}

module.exports.fetchAquariumUrl = function(label) {
    return `${path}/aquarium/${label}.png`;
}

module.exports.fetchBaitImgUrl = function(bait) {
    return `${path}/bait/${bait}.png`;
}

// equipment
module.exports.fetchRodImgUrl = function(rodID) {
    return `${path}/equipment/rods/rod_${rodID}.png`;
}

module.exports.fetchHookImgUrl = function(hookID) {
    return `${path}/equipment/hooks/hook_${hookID}.png`;
}

module.exports.fetchGloveImgUrl = function(gloveID) {
    return `${path}/equipment/gloves/glove_${gloveID}.png`;
}

module.exports.fetchRingImgUrl = function(ringName) {
    return `${path}/equipment/rings/${ringName.replace(/ /g, '_')}_ring.png`;
}

module.exports.fetchSwivelImgUrl = function(swivelID) {
    return `${path}/equipment/swivels/swivel_${swivelID}.png`;
}