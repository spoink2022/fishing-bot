const TextData = require('./data/text.json');

module.exports.getText = function(category, key) {
    return TextData[category][key];
}