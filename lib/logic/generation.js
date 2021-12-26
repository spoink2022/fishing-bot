// Handle All Generating Tasks
// # ----------------------- #

const api = require('../../api');

const QuestNames = api.quest.getQuestNames();
const QuestWeights = api.quest.getQuestWeights();

// Exports
module.exports.generateQuest = async function(userLevel, rewardMultiplier) {
    const questType = indexFromWeightedList(QuestWeights);
    const questData = api.quest.getQuestData(questType);
    
    let min, max, requirement, reward;
    let data = -1;
    let categoryIndex;

    switch (questType) {
        case 0: // catch_tier
            data = indexFromWeightedList(questData.prefixSumChances);
            min = questData.minimums[data];
            max = questData.maximums[data];
            requirement = min + Math.floor(Math.random() * (max-min));
            reward = requirement * questData.rewards[data];
            break;
        case 1: // catch_weight
            categoryIndex = indexFirstElementAboveX(questData.maxLevels, userLevel);
            min = questData.minimums[categoryIndex];
            max = questData.maximums[categoryIndex];
            requirement = min + Math.floor(Math.random() * (max-min));
            reward = requirement * questData.rewards[categoryIndex];
            break;
        case 2: // catch_fish
            const locationId = indexFromLog2Weighting(Math.floor(userLevel/10)+1);
            const locationData = api.fish.getLocationData(locationId);
            const fishData = locationData.fish[Math.floor(Math.random()*locationData.fish.length)];
            const index = 4-indexFirstElementAboveX([0, 3, 8, 12], fishData.chance);
            data = fishData.id;
            min = questData.minimums[index];
            max = questData.maximums[index];
            requirement = min + Math.floor(Math.random() * (max-min));
            reward = requirement * questData.reward * (100/fishData.chance);
            break;
        case 3: // collect_coins
            categoryIndex = indexFirstElementAboveX(questData.maxLevels, userLevel);
            min = questData.minimums[categoryIndex];
            max = questData.maximums[categoryIndex];
            requirement = (min + Math.floor(Math.random() * (max-min))) * 100;
            reward = requirement * questData.rewards[categoryIndex];
            break;
        case 4: // use_bait
            const baitQt = api.bait.getRegularBaitNames().length;
            data = Math.floor(Math.random() * baitQt);
            const baitData = api.bait.getBaitDataById(data);
            min = questData.min;
            max = questData.max;
            requirement = min + Math.floor(Math.random() * (max-min));
            reward = requirement * questData.reward * baitData.value;
            break;
        default:
            break;
    }

    return {
        quest_type: questType,
        quest_requirement: requirement,
        quest_data: data,
        quest_reward: Math.max(Math.round(reward * rewardMultiplier), 2)
    };
}

// Built-In
function indexFromWeightedList(weights) { // arr = [A, B, C, D], weights = [%, %%, %%%, %%%%] (prefixSum, %%%% = 100)
    const r = Math.random() * 100;
    
    for (let i=0; i<weights.length; i++) {
        if (r < weights[i]) {
            return i;
        }
    }
    return weights.length - 1; // in the case of error
}

function indexFirstElementAboveX(arr, x) { // ascending order
    for (let i=0; i<arr.length; i++) {
        if (arr[i] > x) {
            return i;
        }
    }
    return arr.length;
}

function indexFromLog2Weighting(maximum) { // returns from (0, elements-1) (descending)
    // chances = [16, 8, 4, 2, 1]...
    const r = 1 + Math.random()*(Math.pow(2, maximum+1) - 1);
    return Math.floor(Math.log2(r));
}