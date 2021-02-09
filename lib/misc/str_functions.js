module.exports.capitalizeWords = function(str) {
    return str.replace(/\b\w/g, l => l.toUpperCase());
}

module.exports.kgToWeightString = function(kg) {
    return kg >= 1 ? `${kg}kg` : `${Math.round(kg*1000)}g`;
}