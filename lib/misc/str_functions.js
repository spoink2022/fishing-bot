const api = require('../../api');

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

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

module.exports.kgToKgString = function(kg) {
    return `${kg}kg`
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

module.exports.classToString = function(classNum) {
    return ['Small', 'Medium', 'Large', 'Extra Large'][classNum-1];
}

module.exports.convertQuestToString = function(q) {
    let questString = q.type;
    if(q.type === 'catch_tier') {
        questString += ' ' + q.tier;
    } else if(q.type === 'catch_weight') {   
    } else if(q.type === 'catch_fish') {
        questString += ' ' + q.name;
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
        questObj.progress = parseInt(q[q.length-4]);
    } else if(q[0] === 'catch_weight') {
        questObj.progress = parseFloat(q[q.length-4]);
    } else if(q[0] === 'catch_fish') {
        questObj.name = q[1];
        questObj.progress = parseInt(q[q.length-4]);
    }
    questObj.qt = parseInt(q[q.length-3]);
    questObj.reward = parseInt(q[q.length-2]);
    questObj.date = parseInt(q[q.length-1]);
    return questObj;
}

function numToRank(num) {
    if (num % 100 >= 11 && num % 100 <= 13) {
        return `${num}th`;
    } else if (num % 10 === 1) {
        return `${num}st`;
    } else if (num % 10 === 2) {
        return `${num}nd`;
    } else if (num % 10 === 3) {
        return `${num}rd`;
    }
    return `${num}th`;
}
module.exports.numToRank = numToRank;

module.exports.epochToFormattedString = function(epoch) {
    let d = new Date();
    d.setTime(epoch);
    return `${MONTHS[d.getUTCMonth()]} ${numToRank(d.getUTCDate())}, ${d.getUTCFullYear()}`;
}