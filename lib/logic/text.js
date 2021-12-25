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