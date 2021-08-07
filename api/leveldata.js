const PlayerLevelData = require('./data/levels.json');

module.exports.getPlayerLevelInfo = function(level) {
    return PlayerLevelData[level - 1];
}