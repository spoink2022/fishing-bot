module.exports.capitalizeWords = function(str) {
    return str.replace(/\b\w/g, l => l.toUpperCase());
}

module.exports.kgToWeightString = function(kg) {
    return kg >= 1 ? `${kg}kg` : `${Math.round(kg*1000)}g`;
}

module.exports.percentToRarity = function(pct) {
    if(pct >= 12) {
        return 'Common';
    } else if(pct >= 8) {
        return 'Uncommon';
    } else if(pct >= 3) {
        return 'Rare';
    } else {
        return 'Super Rare';
    }
}