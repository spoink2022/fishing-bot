const ColorData = require('./data/colors.json');

module.exports.getColor = function(category, colorName) {
    return ColorData[category][colorName];
}