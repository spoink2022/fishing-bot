module.exports.fetchFishImgUrl = function(fishName) {
    fishName = fishName.replace(/ /g, '_');
    return `https://raw.githubusercontent.com/spoink2022/fishing-bot/main/static/img/fish/${fishName}.png`;
}

module.exports.fetchRodImgUrl = function(rodID) {
    return `https://raw.githubusercontent.com/spoink2022/fishing-bot/main/static/img/equipment/rods/rod_${rodID}.png`;
}

module.exports.fetchHookImgUrl = function(hookID) {
    return `https://raw.githubusercontent.com/spoink2022/fishing-bot/main/static/img/equipment/hooks/hook_${hookID}.png`;
}

module.exports.fetchAssetUrl = function(asset) {
    let baseUrl = `https://raw.githubusercontent.com/spoink2022/fishing-bot/main/static/img/assets/`;
    return baseUrl + asset + '.png';
}

module.exports.fetchAquariumUrl = function(label) {
    return `https://raw.githubusercontent.com/spoink2022/fishing-bot/main/static/img/equipment/${label}.png`;
}

module.exports.fetchBaitImgUrl = function(bait) {
    return `https://raw.githubusercontent.com/spoink2022/fishing-bot/main/static/img/bait/${bait}.png`;
}