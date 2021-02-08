module.exports.capitalizeWords = function(str) {
    return str.replace(/\b\w/g, l => l.toUpperCase());
}