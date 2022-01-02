// Handle All Generating Tasks
// # ----------------------- #

const api = require('../../api');

const QuestWeights = api.quest.getQuestWeights();

// Exports
module.exports.generateCardGrade = function(ring, RingData) {
    const consumer = (100 - ring.premium - ring.sashimi - ring.trophy) * (1 - RingData.gradeBoost[0]/100);
    const premium = (ring.premium + RingData.gradeBoost[0]/100*consumer) * (1 - RingData.gradeBoost[1]/100);
    const sashimi = (ring.sashimi + RingData.gradeBoost[1]/100*ring.premium) * (1 - RingData.gradeBoost[2]/100);
    const trophy = ring.trophy + RingData.gradeBoost[2]/100*ring.sashimi;

    const prefixSumChances = [consumer, consumer + premium, consumer + premium + sashimi];

    const r = Math.random() * 100;
    if (r < prefixSumChances[0]) { return 4; }
    if (r < prefixSumChances[1]) { return 3; }
    if (r < prefixSumChances[2]) { return 2; }
    return 1
}

module.exports.generateFish = async function(locationId, BaitData, WeatherData) {
    const LocationFishData = api.fish.getFishDataFromLocation(locationId);
    const fishOptions = [];
    for (let i=0; i<LocationFishData.length; i++) {
        const fish = LocationFishData[i];
        if (BaitData && !BaitData.sizes.includes(fish.sizeClass)) { continue; }
        fishOptions.push({
            id: fish.id,
            chance: fish.chance * (BaitData && BaitData.families.includes(fish.family) ? 2 : 1) * WeatherData.sizeCurve[fish.sizeClass - 1]
        });
    }

    let prefixSumChances = [];
    fishOptions.forEach((entry, i) => {
        prefixSumChances[i] = (prefixSumChances[i-1] || 0) + entry.chance;
    });

    // Custom Random System for Performance (all numbers generated off of 1 Math.random())
    let generatedFishIds = [], chanceFloat = Math.random() * 10000;
    for (let i=0; i<8; i++) { // once per fish
        const r = prefixSumChances[prefixSumChances.length - 1] * Math.floor(chanceFloat) / 10000;
        for (let j=0; j<prefixSumChances.length; j++) {
            if ( r < prefixSumChances[j]) {
                generatedFishIds.push(fishOptions[j].id);
                break;
            }
        }
        chanceFloat = (chanceFloat - Math.floor(chanceFloat)) * 10000;
    }

    // common suffix means last X digits of r is same for all fish (okay because only one is selected)
    // x, y, tilt, flip based on rFloat (rInt)
    let generatedFish = [], rFloat = Math.random() * 10000, commonSuffix = Math.random() / 10000;
    for (const fishId of generatedFishIds) {
        const FishData = LocationFishData[fishId - LocationFishData[0].id];
        const rInt = Math.floor(rFloat);
        const a = WeatherData.tierCurve;
        let r = rInt/10000 + commonSuffix;
        r = r * (1 + a) - r**2 * a;
        if (rInt % 25 === 0) { r += 0.2; }
        generatedFish.push({
            id: fishId,
            r: r,
            screenLen: FishData.screenLen,
            x: (5 + rInt % 76) / 100,
            y: (35 + rInt % 46) / 100,
            tilt: -20 + rInt % 41,
            flip: rInt % 2
        });
        rFloat = (rFloat - Math.floor(rFloat)) * 10000;
    }

    return generatedFish;
}

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
            const locationId = indexFromLog2Weighting(Math.floor(userLevel/10));
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

module.exports.generateBaitShop = function(startTime) {
    let d = new Date();
    d.setTime(startTime);
    const BaitNames = api.bait.getRegularBaitNames();
    let entry = {
        start_time: startTime,
        end_time: startTime + 86400000,
        date_string: JSON.stringify(`${d.getUTCFullYear()}-${d.getUTCMonth()+1}-${d.getUTCDate()}`)
    };

    for (let i=0; i<3; i++) {
        const chosenBait = BaitNames[Math.floor(Math.random() * BaitNames.length)];
        const BaitData = api.bait.getBaitData(chosenBait);
        const qt = BaitData.min + Math.floor(Math.random() * (BaitData.max - BaitData.min + 1));
        const price = Math.floor(BaitData.value * qt * (0.8 + Math.random()*0.45));
        entry[`option_${i+1}`] = JSON.stringify(chosenBait);
        entry[`qt_${i+1}`] = qt;
        entry[`price_${i+1}`] = price;
    }

    return entry;
}

module.exports.generateWeather = function(startTime) {
    let d = new Date();
    d.setTime(startTime);
    const WeatherLocationData = api.weather.getWeatherLocations();
    let entry = {
        start_time: startTime,
        end_time: startTime + 86400000,
        date_string: JSON.stringify(`${d.getUTCFullYear()}-${d.getUTCMonth()+1}-${d.getUTCDate()}`)
    };

    for (let i=0; i<11; i++) {
        entry[`l${i+1}`] = indexFromWeightedList(WeatherLocationData[i].prefixSumChances);
    }

    return entry;
}

module.exports.generateBounty = function(startTime) {
    const LOCATION_WEIGHTINGS = [
        1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5 ,6, 6, 7, 7, 8, 9, 10
    ]; // skew generation to benefit the community
    const TIER_REWARDS = { 'C': 1.5, 'B': 2.5, 'A': 4, 'S': 8 };
    const TIERS = Object.keys(TIER_REWARDS);
    const BASE_REWARD = 0.8;
    
    let d = new Date();
    d.setTime(startTime);

    const locationId = LOCATION_WEIGHTINGS[Math.floor(Math.random() * LOCATION_WEIGHTINGS.length)];
    const LocationData = api.fish.getLocationData(locationId);
    const fish = LocationData.fish[Math.floor(Math.random() * LocationData.fish.length)];
    const fishName = api.fish.getFishNames()[fish.id];
    const tier = TIERS[Math.floor(Math.random() * TIERS.length)];

    return {
        start_time: startTime,
        end_time: startTime + 604800000,
        date_string: JSON.stringify(`${d.getUTCFullYear()}-${d.getUTCMonth()+1}-${d.getUTCDate()}`),
        fish: JSON.stringify(fishName),
        tier: JSON.stringify(tier),
        reward: Math.round(BASE_REWARD / (fish.chance/100) * TIER_REWARDS[tier] * (0.8 + Math.random() * 0.4))
    };
}

// Built-In
function randomBinomialDist(mean, deviation, deviationLimit) {
    const standardDeviations = Math.sqrt( -2.0 * Math.log(1 - Math.random()) ) * Math.cos( 2.0 * Math.PI * (1 - Math.random()) );
    return mean + Math.max(Math.min(standardDeviations, deviationLimit), -deviationLimit) * deviation;
}

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