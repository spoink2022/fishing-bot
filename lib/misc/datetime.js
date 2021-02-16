// All times are in UTC

module.exports.getDateAsString = function() {
    let d = new Date();
    let mPad = d.getUTCMonth() < 10 ? '0' : '';
    let dPad = d.getUTCDate() < 10 ? '0' : '';
    return `${d.getUTCFullYear()}-${mPad}${d.getUTCMonth()}-${dPad}${d.getUTCDate()}`
}

module.exports.millisToTimeString = function(millis) {
    let seconds = Math.floor(millis/1000);
    let hours = Math.floor(seconds/3600);
    let hStr = hours >= 1 ? `${hours} hour, ` : '';
    seconds -= hours * 3600;
    let mStr = `${seconds >= 60 ? `${Math.floor(seconds/60)} minutes and ` : ''}`;
    seconds -= Math.floor(seconds/60)*60;
    let sStr = `${seconds} seconds`;
    return hStr + mStr + sStr;
}