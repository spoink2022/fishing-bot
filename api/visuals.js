const ColorData = require('./data/colors.json');

module.exports.getColor = function(colourName) {
    return ColorData[colorName];
}