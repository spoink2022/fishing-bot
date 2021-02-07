module.exports.fetchLocationImgUrl = function(locationID) {
    return `https://raw.githubusercontent.com/spoink2022/fishing-bot/main/static/img/unused/${locationID}_bg.jpg`;
}

module.exports.fetchFishImgUrl = function(fishName) {
    fishName = fishName.replace(' ', '_');
    return `https://raw.githubusercontent.com/spoink2022/fishing-bot/main/static/img/fish/${fishName}.png`;
}

module.exports.fetchRodImgUrl = function(rodID) {
    return `https://raw.githubusercontent.com/spoink2022/fishing-bot/main/static/img/equipment/rod_${rodID}.png`;
}

module.exports.fetchHookImgUrl = function(hookID) {
    return `https://raw.githubusercontent.com/spoink2022/fishing-bot/main/static/img/equipment/hook_${hookID}.png`;
}

module.exports.fetchAssetUrl = function(asset) {
    let baseUrl = `https://raw.githubusercontent.com/spoink2022/fishing-bot/main/static/img/assets/`;
    return baseUrl + asset + '.png';
}