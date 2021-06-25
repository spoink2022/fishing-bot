const api = require('../../api');
const db = require('../../db');
const auth = require('../../static/private/auth.json');
const { capitalizeWords, percentToRarity, parseQuestString } = require('./str_functions.js');

const TierMinValues = {'D': 0, 'C': 0.3, 'B': 0.6, 'A': 0.75, 'S': 0.9};
const AquariumTierMultipliers = {'ss': 2, 's': 1, 'a': 0.8, 'b': 0.6, 'c': 0.4, 'd': 0.2};
const AquariumRarityMultipliers = {'Common': 0.5, 'Uncommon': 1, 'Rare': 1.5, 'Super Rare': 2};

function randint(min, max) {
    return min + Math.floor(Math.random()*(max-min+1));
}

function getTier(multiplier) {
    let m = multiplier * 100;
    if(m >= 100) { return 'ss'; }
    else if(m >= 90) { return 's'; }
    else if(m >= 75) { return 'a'; }
    else if(m >= 60) { return 'b'; }
    else if(m >= 30) { return 'c'; }
    else { return 'd'; }
}

function selectRandom(myList) {
    return myList[randint(0, myList.length-1)];
}

function selectFromWeightedList(weighted_list) { // e.g. [30, 30, 20, 10, 10]
    let num = Math.floor(Math.random() * 100) + 1;
    for (let i=0; i<weighted_list.length; i++) {
        if (num <= weighted_list[i]) {
            return i;
        }
        num -= weighted_list[i];
    }
    return weighted_list.length - 1;
}

module.exports.getTier = getTier;

module.exports.getPossibleFishIDs = function(trashChance, fishes, sizeClasses, boostedFamilies, baitUsed) { // generates a list of fish IDs (0 for trash)
    const NUM_OF_FISH = 8;
    let possibleFishIDs = [];
    let validFishes = [];
    let chanceSum = 0;
    for (fish of fishes) {
        if (sizeClasses.includes(fish.sizeClass)) {
            chanceSum += fish.chance;
            validFishes.push(fish);
        }
    }
    for(let i=0; i<NUM_OF_FISH; i++) {
        if(!baitUsed && randint(1, 100) < trashChance) { // trash is selected
            possibleFishIDs.push(0);
        } else { // a fish is selected
            let reroll = false;
            let selectionNum = Math.random()*chanceSum;
            for(let fishChanceObj of validFishes) {
                if(selectionNum <= fishChanceObj.chance) { // get the fish
                    if (baitUsed) {
                        let fishInfo = api.fishing.getFishData(fishChanceObj.id);
                        if (!boostedFamilies.includes(fishInfo.family)) {
                            reroll = true;
                            break;
                        }
                    }
                    possibleFishIDs.push(fishChanceObj.id);
                    break;
                }
                selectionNum -= fishChanceObj.chance;
            }
            if (reroll) {
                let selectionNum = Math.random()*chanceSum;
                for (let fishChanceObj of validFishes) {
                    if (selectionNum <= fishChanceObj.chance) {
                        possibleFishIDs.push(fishChanceObj.id);
                        break;
                    }
                    selectionNum -= fishChanceObj.chance;
                }
            }
        }
    }
    return possibleFishIDs;
}

module.exports.getPossibleFish = function(ids, minTier) { // takes IDs and returns fish objects
    let possibleFish = [];
    for(let id of ids) {
        if(id === 0) { // add trash to the selection
            possibleFish.push({
                id: 0,
                tier: 'f',
                originalScreenLen: 10,
                screenLen: randint(3, 5),
                x: randint(5, 80) / 100,
                y: randint(35, 80) / 100,
                tilt: randint(-90, 90),
                flip: randint(0, 1)
            });
        } else { // add a fish to the selection
            const minSize = TierMinValues[minTier];
            let sizeNum = Math.random()*(1-minSize) + minSize;
            let sizeMult = sizeNum + (Math.random() < 0.05 ? 0.2 : 0.0); // 2 5% chances of additional 20% multiplier
            let screenLenMult = 0.75 + (sizeMult / 2);
            let fishInfo = api.fishing.getFishData(id);
            possibleFish.push({
                id: id,
                weight: Math.round((fishInfo.sizeMin + (fishInfo.sizeMax-fishInfo.sizeMin)*sizeMult) * 1000) / 1000,
                sizeMult: sizeMult,
                tier: getTier(sizeMult),
                originalScreenLen: fishInfo.screenLen,
                screenLen: Math.round(fishInfo.screenLen * screenLenMult * 10) / 10,
                x: randint(5, 80) / 100,
                y: randint(35, 80) / 100,
                tilt: randint(-15, 15),
                flip: randint(0, 1)
            });
        }
    }
    return possibleFish;
}

module.exports.generateAquariumFishTransformations = async function() {
    return {
        x: randint(10, 75) / 100,
        y: randint(15, 75) / 100,
        tilt: randint(-15, 15),
        flip: randint(0, 1)
    };
}

module.exports.getAquariumFishInfo = async function(fishName, sizeMult) {
    let fishID = api.fishing.mapFishNameToID(fishName);
    let generalFishInfo = api.fishing.getFishData(fishID);
    return !sizeMult ? null : {
        name: capitalizeWords(generalFishInfo.name),
        column: generalFishInfo.name.replace(/ /g, '_'),
        tier: getTier(sizeMult),
        rarity: percentToRarity(generalFishInfo.chance),
        sizeMult: sizeMult,
        weight: Math.round((generalFishInfo.sizeMin + (generalFishInfo.sizeMax-generalFishInfo.sizeMin)*sizeMult) * 1000) / 1000,
        screenLen: ((0.75 + (sizeMult / 2)) * generalFishInfo.screenLen * 10)/10,
        id: fishID
    };
}

module.exports.getAquariumFishContent = async function(locationID, user) {
    let LocationInfo = api.fishing.getLocationData(locationID);
    let FishNames = api.fishing.getFishNames();
    let fishColumns = [];
    for(let entry of LocationInfo.fish) {
        fishColumns.push(FishNames[entry.id].replace(/ /g, '_'));
    }
    let multiplierValues = await db.aquarium.getMultiplierValues(user.userid, fishColumns);
    let contentValues = {};
    for(const[key, val] of Object.entries(multiplierValues)) {
        contentValues[key] = await this.getAquariumFishInfo(key, val);
    }
    return contentValues;
}

module.exports.getAquariumEarnRate = async function(locationID, user) {
    let aquariumInfo = api.gamedata.getAquariumInfo(user.aquarium_level);
    let fishContent = await this.getAquariumFishContent(locationID, user);
    let earnRate = 0;
    for(const val of Object.values(fishContent)) {
        earnRate += val === null ? 0 : AquariumTierMultipliers[val.tier] * AquariumRarityMultipliers[val.rarity];
    }
    if(user.premium === 1 || user.premium === 2) { earnRate *= 100; }
    return earnRate * aquariumInfo.multiplier;
}

module.exports.getAquariumEarnings = async function(locationID, user) {
    let AquariumInfo = api.gamedata.getAquariumInfo(user.aquarium_level);
    let earnRate = await this.getAquariumEarnRate(locationID, user);
    let earnings = (Date.now()-user[`last_collected_${locationID}`])/3600000*earnRate;
    return Math.min(Math.round(earnings*10)/10, AquariumInfo.max);
}

module.exports.generateQuest = function(userLevel) {
    const QuestTypeData = api.gamedata.getRandomQuestData();
    let questObj = {};
    let chosenReward, chosenQt;
    if(QuestTypeData.type === 'catch_tier') {
        let r = randint(1, 100);
        let chosenTier;
        for(const [key, val] of Object.entries(QuestTypeData.data)) {
            r -= val.chance;
            if(r <= 0) {
                chosenTier = key;
                break;
            }
        }
        chosenQt = randint(QuestTypeData.data[chosenTier].min, QuestTypeData.data[chosenTier].max);
        chosenReward = (Math.random()*0.5+0.75) * chosenQt * QuestTypeData.data[chosenTier].reward;
        questObj = {
            tier: chosenTier
        };
    } else if(QuestTypeData.type === 'catch_weight') {
        for(let obj of QuestTypeData.data) {
            if(userLevel < obj.levelUnder) {
                chosenQt = randint(obj.min, obj.max);
                chosenReward = (Math.random()*0.5+0.75) * chosenQt * obj.reward;
                break;
            }
        }
    } else if(QuestTypeData.type === 'catch_fish') {
        let unlockedLocations = api.fishing.getUnlockedLocations(userLevel);
        let LocationInfo = api.fishing.getLocationData(selectRandom(unlockedLocations));
        let FishInfo = api.fishing.getFishData(selectRandom(LocationInfo.fish).id);
        let fishRarity = percentToRarity(FishInfo.chance);
        chosenQt = randint(QuestTypeData.data[fishRarity].min, QuestTypeData.data[fishRarity].max);
        chosenReward = Math.max((Math.random()*0.5 + 0.75) * Math.floor(chosenQt * QuestTypeData.data.reward / FishInfo.chance * 100), 1);
        questObj = {
            name: FishInfo.name.replace(/ /g, '_')
        }
    }

    questObj.type = QuestTypeData.type;
    questObj.progress = 0;
    questObj.qt = chosenQt;
    questObj.reward = Math.max(Math.floor(chosenReward), 1);
    questObj.date = Date.now();

    return questObj;
}

module.exports.generateBaitShop = function(startTime) {
    let d = new Date();
    d.setTime(startTime);
    
    // Gets the specific bait names to be used
    let BaitNames = api.gamedata.getAllBaitNames();
    let baitNamesCopy = [...BaitNames]; // can't change the original array
    let chosenBaits = [];
    for(let i=0; i<3; i++) {
        const index = randint(0, baitNamesCopy.length-1);
        chosenBaits.push(baitNamesCopy[index]);
        baitNamesCopy.splice(index, 1);
    }

    // Create object
    let obj = {
        start_time: startTime,
        end_time: startTime + 1000*60*60*24,
        date_string: `${d.getUTCFullYear()}-${d.getUTCMonth()+1}-${d.getUTCDate()}`
    };

    // Apply bait stuff to object
    for (let i=0; i<chosenBaits.length; i++) {
        let bait = chosenBaits[i];
        const BaitInfo = api.gamedata.getBaitData(bait);
        let priceMult = randint(70, 130) / 100;
        let qt = randint(BaitInfo.min, BaitInfo.max);
        let price = Math.max(Math.ceil(BaitInfo.value * qt * priceMult), 1);
        obj[`option_${i+1}`] = bait;
        obj[`price_${i+1}`] = price;
        obj[`qt_${i+1}`] = qt;
    }

    return obj;
}

module.exports.generateBounty = function(startTime) {
    let d = new Date();
    d.setTime(startTime);

    let maxLocationID = api.fishing.getLocationDatasetLength();
    let locationID = randint(1, maxLocationID);
    let locationInfo = api.fishing.getLocationData(locationID);
    
    let fishID = locationInfo.fish[randint(0, locationInfo.fish.length-1)].id;
    let fishInfo = api.fishing.getFishData(fishID);

    const TIERS = Object.keys(TierMinValues);
    let tier = TIERS[randint(0, TIERS.length-1)];

    let reward = Math.round(0.8 / (fishInfo.chance/100) / (1 - TierMinValues[tier]) * (0.8 + Math.random() * 0.4));

    // date_string represents the day at which the bounty starts
    return {
        start_time: startTime,
        end_time: startTime + 1000*60*60*24*7,
        fish: fishInfo.name,
        tier: tier,
        reward: reward,
        date_string: `${d.getUTCFullYear()}-${d.getUTCMonth()+1}-${d.getUTCDate()}`
    };
}

function generateFromRange(range, precision) {
    let raw = range[0] + (Math.random()*(range[1]-range[0]));
    let rounded = Math.floor(raw * (10**precision)) / 10**precision;
    return rounded;
}

module.exports.TROPHY_RANGE = [7, 13];
module.exports.SASHIMI_RANGE = [3, 5];
module.exports.PREMIUM_RANGE = [1.25, 1.75];
module.exports.CONSUMER_RANGE = [0.75, 1.25];

module.exports.generateMarketEntry = function(startTime) {
    let d = new Date();
    d.setTime(startTime);

    const PRECISION = 2;

    return {
        start_time: startTime,
        end_time: startTime + 1000*60*60*24,
        trophy: generateFromRange(this.TROPHY_RANGE, PRECISION),
        sashimi: generateFromRange(this.SASHIMI_RANGE, PRECISION),
        premium: generateFromRange(this.PREMIUM_RANGE, PRECISION),
        consumer: generateFromRange(this.CONSUMER_RANGE, PRECISION),
        date_string: `${d.getUTCFullYear()}-${d.getUTCMonth()+1}-${d.getUTCDate()}`
    };
}

module.exports.getCardValue = function(card, grade=4) {
    const CLASS_MULT = [2, 3, 6, 10];
    const R_FUNCTION = (r) => 0.5 + 0.5*(r+1)**2;
    const BASE_VALUE = 1;
    const GRADE_MULT = [10, 4, 1.5, 1];

    let fishInfo = api.fishing.getFishData(card.fish);
    return (BASE_VALUE + (R_FUNCTION(card.r) * CLASS_MULT[fishInfo.sizeClass-1]))*GRADE_MULT[grade-1];
}

module.exports.generateWeatherEntry = function(startTime) {
    let d = new Date();
    d.setTime(startTime);

    let weatherChoices = [];
    const weatherData = api.gamedata.getWeatherData();
    const WEATHER_REPS = api.fishing.getLocationDatasetLength();
    for (let i=0; i<WEATHER_REPS; i++) {
        weatherChoices.push(selectFromWeightedList(weatherData[i].chances));
    }

    return {
        start_time: startTime,
        end_time: startTime + 1000*60*60*24*7,
        date_string: `${d.getUTCFullYear()}-${d.getUTCMonth()+1}-${d.getUTCDate()}`,
        weather: weatherChoices
    };
}