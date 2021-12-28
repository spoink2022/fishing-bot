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



module.exports.generateRing = function(PackData, packType) {
    let ring = {};
    const PackChances = api.equipment.getRingPackChances(packType);
    const RingNames = api.equipment.getRingNames();
    ring.ring_type = RingNames[indexFromWeightedList(PackChances)];
    
    const RingData = api.equipment.getRingData(ring.ring_type);
    const SellRate = api.equipment.getRingSellRate(RingData.rating);
    ring.value = Math.round(SellRate/100 * PackData.regular.price);

    for (let sizeClass of ['s', 'm', 'l', 'xl']) {
        let val = randomBinomialDist(PackData.sizeClass.mean, PackData.sizeClass.dev, PackData.sizeClass.devLimit);
        ring[sizeClass] = Math.max(Math.round(val * 10) / 10 + (packType === 'premium' ? 1 : 0), 0);
    }
    for (let grade of ['premium', 'sashimi', 'trophy']) {
        let val = randomBinomialDist(PackData.grades[grade].mean, PackData.grades[grade].dev, PackData.grades[grade].devLimit);
        ring[grade] = Math.max(Math.round(val + (packType === 'premium' ? (grade === 'trophy' ? 0.5 : (grade === 'sashimi' ? 2 : 0)) : 0)), 0);
    }

    return ring;
}

function randomBinomialDist(mean, deviation, deviationLimit) {
    const standardDeviations = Math.sqrt( -2.0 * Math.log(1 - Math.random()) ) * Math.cos( 2.0 * Math.PI * (1 - Math.random()) );
    return mean + Math.max(Math.min(standardDeviations, deviationLimit), -deviationLimit) * deviation;
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