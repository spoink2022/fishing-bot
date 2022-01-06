// Provide Quest Information to Program
// # -------------------------------- #

const QuestData = require('./data/quest.json');

// Formatted Data
const QuestNames = Object.keys(QuestData);
const QuestWeights = getPrefixSum(Object.values(QuestData).map(obj => obj.chance));

// Formatting Functions
function getPrefixSum(arr) {
    let prefixSum = [];
    for (let i=0; i<arr.length; i++) {
        prefixSum.push(arr[i] + (prefixSum[i-1] || 0));
    }
    return prefixSum;
}

// Exports
module.exports.getQuestNames = function() {
    return QuestNames;
}

module.exports.getQuestWeights = function() {
    return QuestWeights;
}

module.exports.getQuestData = function(questType) { // (int)questType
    return QuestData[QuestNames[questType]].data;
}