const TextData = require('./data/text.json');

module.exports.getText = function(category, key) {
    return TextData[category][key];
}
module.exports.getTitles = function(category) {
    return Object.keys(TextData[category]);
}