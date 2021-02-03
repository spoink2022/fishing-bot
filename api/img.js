module.exports.fetchLocationImgUrl = function(locationID) {
    return `https://raw.githubusercontent.com/spoink2022/fishing-bot/main/static/img/unused/${locationID}_bg.jpg`
}

module.exports.fetchFishImgUrl = function(fishID, imgNum) {
    return `https://raw.githubusercontent.com/spoink2022/fishing-bot/main/static/img/fish/${fishID}_${imgNum}.png`;
}

module.exports.fetchRodImgUrl = function(rodID, lineID) {
    return `https://raw.githubusercontent.com/spoink2022/fishing-bot/main/static/img/equipment/rod_${rodID}_${lineID}.png`
}