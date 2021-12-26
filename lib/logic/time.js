// Handle Time Logic
// # ------------- #

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