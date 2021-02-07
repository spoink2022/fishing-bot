const api = require('../../api');

const TRASH_TYPES = 4;

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

module.exports.getPossibleFishIDs = function(trashChance, fishes) { // generates a list of fish IDs (0 for trash)
    const NUM_OF_FISH = 20;
    let possibleFishIDs = [];
    for(let i=0; i<NUM_OF_FISH; i++) {
        if(randint(1, 100) < trashChance) { // trash is selected
            possibleFishIDs.push(0);
        } else { // a fish is selected
            let selectionNum = randint(1, 100);
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
                screenLen: randint(6, 8),
                x: randint(5, 80) / 100,
                y: randint(30, 80) / 100,
                tilt: randint(-90, 90),
                flip: randint(0, 1)
            });
        } else { // add a fish to the selection
            let sizeNum = Math.random();
            let sizeMult = sizeNum + (Math.random() < 1 ? 0.2 : 0.0); // 5% chance of additional 20% multiplier
            let screenLenMult = 0.75 + (sizeMult / 2);
            let fishInfo = api.fishing.getFishData(id);
            possibleFish.push({
                id: id,
                weight: Math.round((fishInfo.sizeMin + (fishInfo.sizeMax-fishInfo.sizeMin)*sizeMult) * 1000) / 1000,
                sizeMult: sizeMult,
                tier: getTier(sizeMult),
                screenLen: Math.round(fishInfo.screenLen * screenLenMult * 10) / 10,
                x: randint(5, 80) / 100,
                y: randint(30, 80) / 100,
                tilt: randint(-15, 15),
                flip: randint(0, 1)
            });
        }
    }
    return possibleFish;
}