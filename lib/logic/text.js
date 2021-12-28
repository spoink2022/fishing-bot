// Handle Text Logic
// # ------------- #

module.exports.capitalizeWords = function(str) {
    return str.replace(/\b\w/g, l => l.toUpperCase()).replace('Aaa', 'AAA').replace('Aa', 'AA');
}

module.exports.kgToWeight = function(kg) {
    if(kg >= 1000) {
        return `${Math.round(kg)/1000}t`;
    } else if(kg >= 1) {
        return `${Math.round(kg*1000)/1000}kg`;
    }
    return `${Math.round(kg*1000)}g`;
}

module.exports.numToRank = function(num) {
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

module.exports.pctToRarity = function(num) {
    if (num >= 12) {
        return 'Common';
    } else if (num >= 8) {
        return 'Uncommon';
    } else if (num >= 3) {
        return 'Rare';
    }
    return 'Super Rare';
}

module.exports.rToTier = function(r) {
    if (r >= 1) {
        return 'SS';
    } else if (r >= 0.9) {
        return 'S';
    } else if (r >= 0.75) {
        return 'A';
    } else if (r >= 0.6) {
        return 'B';
    } else if (r >= 0.3) {
        return 'C';
    }
    return 'D';
}