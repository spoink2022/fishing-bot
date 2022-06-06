const { PROD } = require('../private/config.json');

let path = 'static/img' || 'https://storage.googleapis.com/fishingbot/assets';
if (!PROD) {
    path = 'static/img';
    //path = 'https://raw.githubusercontent.com/spoink2022/fishing-bot/main/static/img';
    console.log('Using Dev Path...');
}

module.exports.CLOUD_PATH = 'https://storage.googleapis.com/fishingbot/assets';

module.exports.fetchFishImgUrl = function(fishName) {
    fishName = fishName.replace(/ /g, '_');
    return `${path}/fish/${fishName}.png`;
}

module.exports.fetchAssetUrl = function(asset) {
    return `${path}/misc/${asset}.png`;
}

module.exports.fetchCosmeticUrl = function(cosmetic, category) {
    return `${path}/cosmetics/${category}/${cosmetic}.png`;
}

module.exports.fetchBackgroundUrl = function(key) {
    return `${path}/background/${key}.png`;
}

module.exports.fetchAquariumImgUrl = function(label) {
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

// clan boat
module.exports.fetchHullImgUrl = function(hullId) {
    return `${path}/clanboat/hull/hull_${hullId}.png`;
}

module.exports.fetchEngineImgUrl = function(engineId) {
    return `${path}/clanboat/engine/engine_${engineId}.png`;
}

module.exports.fetchContainerImgUrl = function(containerId) {
    return `${path}/clanboat/container/container_${containerId}.png`;
}

module.exports.fetchPropellerImgUrl = function(propellerId) {
    return `${path}/clanboat/propeller/propeller_${propellerId}.png`;
}

module.exports.fetchClanLocationImgUrl = function(clanLocationId) {
    return `${path}/clanboat/location/${clanLocationId}.png`;
}