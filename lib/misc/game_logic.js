const api = require('../../api');
const db = require('../../db');
const { capitalizeWords } = require('./str_functions.js');

const AquariumLevels = {'ss': 5, 's': 2.5, 'a': 2, 'b': 1.5, 'c': 1, 'd': 0.5};

function randint(min, max) {
    return min + Math.floor(Math.random()*(max-min+1));
}

function getTier(multiplier) {
    let m = multiplier * 100;
    if(m > 100) { return 'ss'; }
    else if(m > 90) { return 's'; }
    else if(m > 75) { return 'a'; }
    else if(m > 60) { return 'b'; }
    else if(m > 30) { return 'c'; }
    else { return 'd'; }
}

module.exports.getTier = getTier;

module.exports.getPossibleFishIDs = function(trashChance, fishes) { // generates a list of fish IDs (0 for trash)
    const NUM_OF_FISH = 8;
    let possibleFishIDs = [];
    for(let i=0; i<NUM_OF_FISH; i++) {
        if(randint(1, 100) < trashChance) { // trash is selected
            possibleFishIDs.push(0);
        } else { // a fish is selected
            let selectionNum = randint(0, 99) + Math.random();
            for(let fishChanceObj of fishes) {
                if(selectionNum <= fishChanceObj.chance) { // get the fish
                    possibleFishIDs.push(fishChanceObj.id);
                    break;
                }
                selectionNum -= fishChanceObj.chance;
            }
        }
    }
    return possibleFishIDs;
}

module.exports.getPossibleFish = function(ids) { // takes IDs and returns fish objects
    let possibleFish = [];
    for(let id of ids) {
        if(id === 0) { // add trash to the selection
            possibleFish.push({
                id: 0,
                tier: 'f',
                originalScreenLen: 10,
                screenLen: randint(4, 7),
                x: randint(5, 80) / 100,
                y: randint(35, 80) / 100,
                tilt: randint(-90, 90),
                flip: randint(0, 1)
            });
        } else { // add a fish to the selection
            let sizeNum = Math.random();
            let sizeMult = sizeNum + (Math.random() < 0.05 ? 0.2 : 0.0) + (Math.random() < 0.05 ? 0.2 : 0.0); // 2 5% chances of additional 20% multiplier
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
        earnRate += val === null ? 0 : AquariumLevels[val.tier];
    }
    return earnRate * aquariumInfo.multiplier;
}

module.exports.getAquariumEarnings = async function(locationID, user) {
    let AquariumInfo = api.gamedata.getAquariumInfo(user.aquarium_level);
    let earnRate = await this.getAquariumEarnRate(locationID, user);
    let earnings = (Date.now()-user.last_collected)/3600000*earnRate + user.aquarium_tmp;
    return Math.min(Math.round(earnings*10)/10, AquariumInfo.max);
}