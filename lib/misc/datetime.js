// All times are in UTC

module.exports.getDateAsString = function() {
    let d = new Date();
    let mPad = d.getUTCMonth() < 10 ? '0' : '';
    let dPad = d.getUTCDate() < 10 ? '0' : '';
    return `${d.getUTCFullYear()}-${mPad}${d.getUTCMonth()}-${dPad}${d.getUTCDate()}`
}

module.exports.millisToTimeString = function(millis) {
    if(millis <= 1000) { return '1 second'; } // prevents "0 seconds"
    let seconds = Math.floor(millis/1000);
    let hours = Math.floor(seconds/3600);
    seconds -= hours*3600;
    let minutes = Math.floor(seconds/60);
    seconds -= minutes*60;

    let hStr = hours >= 1 ? `${hours} hour${hours > 1 ? 's' : ''}` : '';
    let mStr = minutes >=1 ? `${minutes} minute${minutes > 1 ? 's' : ''}` : '';
    let sStr = seconds >= 1  ? `${seconds} second${seconds > 1 ? 's': ''}` : '';
    
    if(minutes >= 1 && seconds >= 1) {
        sStr = ' and ' + sStr;
    }
    if((minutes >= 1 || seconds >= 1) && hours >= 1) {
        hStr += ', ';
    }

    return hStr + mStr + sStr;
}