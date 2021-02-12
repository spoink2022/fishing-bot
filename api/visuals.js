const ColorData = require('./data/colors.json');

module.exports.getColor = function(colorName) {
    return ColorData[colorName];
}