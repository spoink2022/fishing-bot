// Handle Text Logic
// # ------------- #

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

module.exports.capitalizeWords = function(str) {
    return str.replace(/\b\w/g, l => l.toUpperCase()).replace('Aaa', 'AAA').replace('Aa', 'AA');
}

module.exports.epochToDateString = function(epoch) {
    let d = new Date();
    d.setTime(epoch);
    return `${MONTHS[d.getUTCMonth()]} ${this.numToRank(d.getUTCDate())}, ${d.getUTCFullYear()}`;
}

module.exports.kgToWeight = function(kg) {
    if(kg >= 1000) {
        return `${Math.round(kg)/1000}t`;
    } else if(kg >= 1) {
        return `${Math.round(kg*1000)/1000}kg`;
    }
    return `${Math.round(kg*1000)}g`;
}

module.exports.millisToString = function(millis) {
    if (millis <= 1000) { return '1 second'; } // prevents "0 seconds"
    const s = Math.floor(millis/1000) % 60;
    const m = Math.floor(millis/60000) % 60;
    const h = Math.floor(millis/3600000) % 24;
    const d = Math.floor(millis/86400000);

    let dStr = d >= 1 ? `${d} day${d > 1 ? 's': ''}` : '';
    let hStr = h >= 1 ? `${h} hour${h > 1 ? 's' : ''}` : '';
    let mStr = m >= 1 ? `${m} minute${m > 1 ? 's' : ''}` : '';
    let sStr = s >= 1  ? `${s} second${s > 1 ? 's': ''}` : '';
    
    if(m >= 1 && s >= 1) { sStr = ' and ' + sStr; }
    
    if((m >= 1 || s >= 1) && h >= 1) { hStr += ', '; }

    if (d >= 1 && (h >= 1 || m >= 1 || s >= 1)) { dStr += ', '; }

    return dStr + hStr + mStr + sStr;
}

module.exports.millisToHoursAndMinutes = function(millis) {
    if (millis <= 60000) { return '1 minute'; } // prevents "0 minutes"
    const m = Math.floor(millis/60000) % 60;
    const h = Math.floor(millis/3600000);

    let hStr = h >= 1 ? `${h} hour${h > 1 ? 's' : ''}` : '';
    let mStr = m >= 1 ? `${m} minute${m > 1 ? 's' : ''}` : '';

    if (h >= 1 && m >= 1) {
        hStr += ', ';
    }

    return hStr + mStr;
}

module.exports.millisToDaysAndHours = function(millis) {
    // expects large numbers (at least 1 hour)
    const h = Math.floor(millis/3600000) % 24;
    const d = Math.floor(millis/86400000);
    
    let dStr = d >= 1 ? `${d} day${d > 1 ? 's' : ''}` : '';
    let hStr = h >= 1 ? `${h} hour${h > 1 ? 's' : ''}` : '';

    if (d >= 1 && h >= 1) {
        dStr += ', ';
    }

    return dStr + hStr;
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