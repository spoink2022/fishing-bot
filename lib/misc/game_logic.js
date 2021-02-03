const api = require('../../api');

function randint(min, max) {
    return min + Math.floor(Math.random()*(max-min+1));
}

module.exports.getPossibleFishIDs = function(trashChance, fishes) { // generates a list of fish IDs (0 for trash)
    const NUM_OF_FISH = 4;
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
            possibleFish.push({id: 0});
        } else { // add a fish to the selection
            let sizeNum = Math.random();
            let sizeMult = sizeNum + (Math.random() < 0.1 ? 0.2 : 0.0); // 10% chance of additional 20% multiplier
            let screenLenMult = 0.75 + (sizeMult / 2);
            let fishInfo = api.fishing.getFishData(id);
            possibleFish.push({
                id: id,
                weight: Math.round((fishInfo.sizeMin + (fishInfo.sizeMax-fishInfo.sizeMin)*sizeMult) * 1000) / 1000,
                screenLen: Math.round(fishInfo.screenLen * screenLenMult * 10) / 10
            });
        }
    }
    return possibleFish;
}