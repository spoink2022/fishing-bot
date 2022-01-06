const PlayerLevelData = require('./data/levels.json');

module.exports.getPlayerLevelData = function(level) {
    return PlayerLevelData[level - 1];
}