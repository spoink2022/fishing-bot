module.exports.capitalizeWords = function(str) {
    return str.replace(/\b\w/g, l => l.toUpperCase()).replace('Aaa', 'AA').replace('Aa', 'AA');
}

module.exports.kgToWeightString = function(kg) {
    if(kg >= 1000) {
        return `${Math.round(kg)/1000} t`;
    } else if(kg >= 1) {
        return `${kg}kg`;
    } else {
        return `${Math.round(kg*1000)}g`;
    }
}

function percentToRarity(pct) {
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
module.exports.percentToRarity = percentToRarity;

module.exports.percentToRarityAbbr = function(pct) {
    const abbrMap = {'Common': 'C', 'Uncommon': 'U', 'Rare': 'R', 'Super Rare': 'SR'}
    return abbrMap[percentToRarity(pct)];
}