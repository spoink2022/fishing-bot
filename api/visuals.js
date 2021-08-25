const e = require('express');
const ColorData = require('./data/colors.json');

module.exports.getColor = function(category, colorName) {
    return ColorData[category][colorName];
}

module.exports.getNestedColor = function(category, colorName, key) { // when using an extra object of depth
    return ColorData[category][colorName][key];
}