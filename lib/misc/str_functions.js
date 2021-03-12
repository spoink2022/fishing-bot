module.exports.capitalizeWords = function(str) {
    return str.replace(/\b\w/g, l => l.toUpperCase()).replace('Aaa', 'AAA').replace('Aa', 'AA');
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

module.exports.convertQuestToString = function(q) {
    let questString = q.type;
    if(q.type === 'catch_tier') {
        questString += ' ' + q.tier;
    }
    questString += ' ' + [q.progress, q.qt, q.reward, q.date].join(' ');
    return questString;
}

module.exports.parseQuestString = function(questString) {
    let q = questString.split(' ');
    let questObj = {
        type: q[0]
    };
    if(q[0] === 'catch_tier') {
        questObj.tier = q[1];
    }
    questObj.progress = parseInt(q[q.length-4]);
    questObj.qt = parseInt(q[q.length-3]);
    questObj.reward = parseInt(q[q.length-2]);
    questObj.date = parseInt(q[q.length-1]);
    return questObj;
}