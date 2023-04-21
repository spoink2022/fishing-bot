// Gameplay Calculations
// # ----------------- #

const api = require('../../api');
const logic = require('../logic');

module.exports.calculateFishWeight = function(r, FishData) {
    return Math.round((FishData.sizeMin + r*(FishData.sizeMax - FishData.sizeMin)) * 1000 ) / 1000;
}

module.exports.calculateRawEarnRate = function(FishValues, FishChances) { // arrays
    let earnRate = 0;
    for (let i=0; i<FishValues.length; i++) {
        if (FishValues[i] === -1) { continue; }
        const chance = FishChances[i] || 0.2; // legendary
        earnRate += (FishValues[i]**2 + (FishValues[i] >= 1 ? 1 : 0.5)) / Math.sqrt(chance) * 2;
    }
    return earnRate;
}

module.exports.getMaxWeight = async function(user, clan, event) {
    const pctIncrease = logic.clan.getMaxWeightIncrease(clan);
    const rod = api.equipment.getRodData(user.rod);
    const line = api.equipment.getLineData(user.line);
    const hook = api.equipment.getHookData(user.hook);
    let maxWeight = Math.min(rod.maxWeight, line.maxWeight, hook.maxWeight) * (1 + pctIncrease/100);
    if (event) {
        // account for events
        // pass event = false for non-event usecases (e.g. equipment command)
    }
    return maxWeight;
}

module.exports.getCooldownTime = function(user, clan, event) {
    const RodData = api.equipment.getRodData(user.rod);
    let cooldown = RodData.cooldown;
    if (event && event.type === 'decreasedFishingCooldown') {
        cooldown *= (100-parseInt(event.params))/100;
    }
    if (clan) {
        let pctReduction = logic.clan.getCooldownReduction(clan);
        cooldown *= (100-pctReduction)/100;
    }
    return cooldown;
}

module.exports.getRingAverages = function(ring) {
    const RingData = api.equipment.getRingData(ring.ring_type);
    let chance = (ring.s + ring.m + ring.l + ring.xl + RingData.classBoost.reduce((a, b) => a+b))/4;
    if (RingData.dropMultiplier) {
        chance *= RingData.dropMultiplier;
    }

    /*ring.consumer = (100 - ring.premium - ring.sashimi - ring.trophy) * (1 - RingData.gradeBoost[0]/100);
    ring.premium = (ring.premium + RingData.gradeBoost[0]/100*ring.consumer) * (1 - RingData.gradeBoost[1]/100);
    ring.sashimi = (ring.sashimi + RingData.gradeBoost[1]/100*ring.premium) * (1 - RingData.gradeBoost[2]/100);
    ring.trophy += RingData.gradeBoost[2]/100*ring.sashimi;*/

    ring.consumer = (100 - ring.premium - ring.sashimi - ring.trophy);
    
    ring.premium += ring.consumer * RingData.gradeBoost[0]/100;
    ring.consumer -= ring.consumer * RingData.gradeBoost[0]/100;

    ring.sashimi += ring.premium * RingData.gradeBoost[1]/100;
    ring.premium -= ring.premium * RingData.gradeBoost[1]/100;

    ring.trophy += ring.sashimi * RingData.gradeBoost[2]/100;
    ring.sashimi -= ring.sashimi * RingData.gradeBoost[2]/100;

    let gradeMultiplier = 1 + ring.premium*0.005 + ring.sashimi*0.03 + ring.trophy*0.09;

    return {
        chance: Math.round(chance*10)/10,
        mult: Math.round(gradeMultiplier*10)/10
    };
}

module.exports.calculateCardValue = function(card) {
    const CLASS_MULT = [2, 3, 6, 10];
    const rFunction = (r) => 0.5 + 0.5*(r+1)**2;
    const BASE_VALUE = 1;
    const GRADE_MULT = [10, 4, 1.5, 1];

    let FishData = api.fish.getFishData(card.fish);
    let value = Math.round((BASE_VALUE + (rFunction(card.r) * CLASS_MULT[FishData.sizeClass-1])) * GRADE_MULT[card.grade-1]);
    if (FishData.legendary) { value *= 2; }
    return value;
}

// Fisher Score
module.exports.calculateFisherScore = function(fishMap, AllFishData) {
    let score = 0;
    for (let FishData of AllFishData) {
        if (fishMap[FishData.name] === -1) { continue; }
        const r = fishMap[FishData.name];
        const c = FishData.chance || 0.2; // legendary
        const fishScore = 20 * (r**2 + 0.2 + (r >= 1 ? 0.5 : 0)) * (16 / (16 + c));
        score += fishScore;
    }
    return score;
}

module.exports.calculateFisherScores = function(fishMap, AllFishData) {
    let scores = {};
    for (let FishData of AllFishData) {
        if (fishMap[FishData.name] === -1) { continue; }
        const r = fishMap[FishData.name];
        const c = FishData.chance || 0.2; // legendary;
        const fishScore = 20 * (r**2 + 0.2 + (r >= 1 ? 0.5 : 0)) * (16 / (16 + c));
        scores[FishData.name] = fishScore;
    }
    return scores;
}