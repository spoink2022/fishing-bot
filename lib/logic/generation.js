// Handle All Generating Tasks
// # ----------------------- #

const api = require('../../api');

const QuestWeights = api.quest.getQuestWeights();

const TIER_MAP = { 'D': 0, 'C': 0.3, 'B': 0.6, 'A': 0.75, 'S': 0.9, 'SS': 1 };

const BOAT_COMMON = 65;
const BOAT_UNCOMMON = 30;
const BOAT_RARE = 5;

// Exports
module.exports.generateCardGrade = function(ring, RingData) {
    //const consumer = (100 - ring.premium - ring.sashimi - ring.trophy) * (1 - RingData.gradeBoost[0]/100);
    //const premium = (ring.premium + RingData.gradeBoost[0]/100*consumer) * (1 - RingData.gradeBoost[1]/100);
    //const sashimi = (ring.sashimi + RingData.gradeBoost[1]/100*ring.premium) * (1 - RingData.gradeBoost[2]/100);
    //const trophy = ring.trophy + RingData.gradeBoost[2]/100*ring.sashimi;
    let r = Math.random() * 100;
    let grade;
    if (r < ring.trophy) {
        grade = 1;
    } else if (r < ring.trophy + ring.sashimi) {
        grade = 2;
    } else if (r < ring.trophy + ring.sashimi + ring.premium) {
        grade = 3;
    } else {
        grade = 4;
    }

    if (grade == 4 && RingData.gradeBoost[0] != 0) {
        let r1 = (r*100) % 100;
        if (r1 < RingData.gradeBoost[0]) {
            grade = 3;
        }
    }
    if (grade == 3) {
        let r1 = (r*10000) % 100;
        if (r1 < RingData.gradeBoost[1]) {
            grade = 2;
        }
    }
    if (grade == 2) {
        let r1 = (r*1000000) % 100;
        if (r1 < RingData.gradeBoost[2]) {
            grade = 1;
        }
    }

    /*if (r < prefixSumChances[0]) { return 4; }
    if (r < prefixSumChances[1]) { return 3; }
    if (r < prefixSumChances[2]) { return 2; }
    return 1;*/
    return grade;
}

module.exports.generateFish = async function(locationId, BaitData, WeatherData, spawnLegendary) {
    const LocationFishData = api.fish.getFishDataFromLocation(locationId);
    const fishOptions = [];
    const LegendarySpawn = {
        'Sunny': 0.1,
        'Partly Cloudy': 0.1,
        'Cloudy': 0.1,
        'Rainy': 0.1,
        'Stormy': 0.2
    };
    for (let i=0; i<LocationFishData.length; i++) {
        const fish = LocationFishData[i];
        if (BaitData && !BaitData.sizes.includes(fish.sizeClass)) { continue; }
        if (fish.legendary) {
            if (spawnLegendary) {
                fishOptions.push({
                    id: fish.id,
                    chance: LegendarySpawn[WeatherData.name] * (BaitData && BaitData.families && BaitData.families.includes(fish.family) ? 2 : 1) * WeatherData.sizeCurve[fish.sizeClass - 1]
                });
            }
            continue;
        }
        fishOptions.push({
            id: fish.id,
            chance: fish.chance * (BaitData && BaitData.families && BaitData.families.includes(fish.family) ? 2 : 1) * WeatherData.sizeCurve[fish.sizeClass - 1]
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
            if (r < prefixSumChances[j]) {
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
        const FishData = api.fish.getFishData(fishId);
        const rInt = Math.floor(rFloat);
        const a = WeatherData.tierCurve;
        const seed = rInt/10000 + commonSuffix; // initial r
        r = seed * (1 + a) - seed**2 * a; // curve for weather ([0 - 1] => [0 - 1])
        if (BaitData) { // curve for bait ([0 - 1] => [X - 1])
            const minR = TIER_MAP[BaitData.tier];
            r = minR + (1 - minR) * r;
            if (BaitData.tier === 'SS') {
                r += Math.random() * 0.2;
            }
        }
        if (rInt % 25 === 0 && (!BaitData || (BaitData && BaitData.tier !== 'SS'))) { r += 0.2; } // chance for bonus +0.2 (not with SS bait)
        generatedFish.push({
            id: fishId,
            r: r,
            seed: seed,
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
            requirement = (min + Math.floor(Math.random() * (max-min))) * 1000;
            reward = Math.round(requirement * questData.rewards[categoryIndex] / 1000);
            break;
        case 2: // catch_fish
            const locationId = Math.min(Math.max(indexFromLog2Weighting(Math.floor(userLevel/10) + 1), 1), Math.min(Math.floor(userLevel/10) + 1, 14)); // 14 is highest location
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
            reward = requirement * questData.rewards[categoryIndex] / 100;
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
        quest_reward: Math.max(Math.round(reward * rewardMultiplier * 1.2), 2)
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

    for (let i=0; i<4; i++) {
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

module.exports.generateServerShop = function(entryCount) {
    const epochWeek = Math.floor((Date.now() - 4*86400000) / 604800000); // offset 4 days to match bounty
    let entries = [];
    for (let i=0; i<entryCount; i++) {
        const isPremium = Math.random() < 0.5;
        const BaitNames = isPremium ? api.bait.getPremiumBaitNames() : api.bait.getRegularBaitNames();
        const baitName = BaitNames[Math.floor(Math.random() * BaitNames.length)];
        const BaitData = api.bait.getBaitData(baitName);
        const qt = isPremium ? Math.floor(Math.random() * 2) + 1 : BaitData.min - 1;
        const price = isPremium ? Math.floor(BaitData.value * qt * (0.8 + Math.random()*0.45)) : 0;
        entries.push(`${baitName} ${qt} ${price}`);
    }
    return entries;
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

    for (let i=0; i<14; i++) {
        entry[`l${i+1}`] = indexFromWeightedList(WeatherLocationData[i].prefixSumChances);
    }

    return entry;
}

module.exports.generateBounty = function(startTime) {
    const LOCATION_WEIGHTINGS = [
        1, 1, 2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 6, 7, 7, 7, 8, 8, 9, 9, 10, 11
    ]; // skew generation to benefit the community
    const TIER_REWARDS = { 'B': 2.5, 'A': 4, 'S': 8 };
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

module.exports.generateBoatRewards = function(clanLocationId, boatCapacity, userLevel) {
    const ClanLocationData = api.clan.getClanLocationData(clanLocationId);
    const AllLocationData = api.fish.getAllUnlockedLocationData(userLevel);
    let rewards = [];

    for (let i=0; i<boatCapacity; i++) {
        const r2 = Math.floor(Math.random()*10000) % 100; // better random
        const rarity = r2 < BOAT_COMMON ? 'common' : r2 < BOAT_COMMON + BOAT_UNCOMMON ? 'uncommon' : 'rare';
        const rewardKey = pickFromArr(ClanLocationData.spawns[rarity]);
        if (rewardKey[0] === 'l') { // fish
            const LocationData = AllLocationData[parseInt(rewardKey.substring(1)) - 1]
            if (!LocationData) { // not unlocked
                rewards.push({
                    rewardType: 'fishNotUnlocked',
                    location: rewardKey.substring(1)
                });
            } else { // unlocked
                const fishIndex = indexFromWeightedList(LocationData.prefixSumChances);
                const fishId = LocationData.fish[fishIndex].id;
                let r = 0.3 + 0.7*Math.random();
                if (Math.floor(r * 100000) % 25 === 0) { r += 0.2; } // r * 100000 is practically a random int
                rewards.push({
                    rewardType: 'fish',
                    fish: fishId,
                    r: r
                });
            }
        } else if (rewardKey[0] === 'b') { // bait
            if (parseInt(rewardKey[1]) <= 4) {
                const PossibleBaitNames = api.bait.getBaitNamesByStars(rewardKey.substring(1));
                const baitName = pickFromArr(PossibleBaitNames);
                rewards.push({
                    rewardType: 'bait',
                    bait: baitName
                });
            } else {
                let color = pickFromArr(['blue', 'red', 'white', 'yellow']);
                let chumName;
                switch (parseInt(rewardKey[1])) {
                    case 5: // Spiked Chum
                        chumName = `spiked_${color}_chum`;
                        break;
                    case 6: // Ultimate Chum
                        chumName = `ultimate_${color}_chum`;
                        break;
                    case 7: // Silver Chum
                        chumName = `silver_chum`;
                        break;
                    case 8: // Gold Chum
                        chumName = 'gold_chum';
                        break;
                    case 9: // Diamond Chum
                        chumName = 'diamond_chum';
                        break;
                    default:
                        break;
                }
                rewards.push({
                    rewardType: 'bait',
                    bait: chumName
                })
            }
        }
    }

    return rewards;
}

// Built-In
function randomBinomialDist(mean, deviation, deviationLimit) {
    const standardDeviations = Math.sqrt( -2.0 * Math.log(1 - Math.random()) ) * Math.cos( 2.0 * Math.PI * (1 - Math.random()) );
    return mean + Math.max(Math.min(standardDeviations, deviationLimit), -deviationLimit) * deviation;
}

function pickFromArr(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
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

// CHECK THIS FUNCTION FOR ISSUES
function indexFromLog2Weighting(maximum) { // returns from (0, elements-1) (descending)
    // chances = [16, 8, 4, 2, 1]...
    const r = 1 + Math.random()*(Math.pow(2, maximum+1) - 1);
    return Math.floor(Math.log2(r));
}
