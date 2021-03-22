let processingBaitShop = [];


module.exports.bait = {};
module.exports.bait.isProcessing = function(userid) {
    return processingBaitShop.includes(userid);
}

module.exports.bait.setProcessing = function(userid) {
    if (!processingBaitShop.includes(userid)) {
        processingBaitShop.push(userid);
    }
}

module.exports.bait.endProcessing = function(userid) {
    processingBaitShop = processingBaitShop.filter(id => id !== userid);
}