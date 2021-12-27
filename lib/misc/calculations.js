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
        earnRate += (FishValues[i]**2 + (FishValues[i] >= 1 ? 1 : 0.5)) / Math.sqrt(FishChances[i]) * 2;
    }
    return earnRate;
}

module.exports.getMaxWeight = async function(user, event) {
    const rod = api.fishing.getRodData(user.rod);
    const line = api.fishing.getLineData(user.line);
    const hook = api.fishing.getHookData(user.hook);
    let maxWeight = Math.min(rod.maxWeight, line.maxWeight, hook.maxWeight);
    if (event) {
        // account for events
        // pass event = false for non-event usecases (e.g. equipment command)
    }
    return maxWeight;
}

module.exports.getRemainingCooldown = async function(user, clan, event) {
    const rod = api.fishing.getRodData(user.rod);
    let cooldown = rod.cooldown;
    if (event) {
        if (event.type === 'decreasedFishingCooldown') {
            cooldown *= parseFloat(event.params);
        }
    }
    if (clan) {
        let pctReduction = logic.clan.getCooldownReduction(clan);
        cooldown *= (100-pctReduction)/100;
    }
    return cooldown;
}

module.exports.getRingAverages = function(ring) {
    const ringData = api.equipment.getRingData(ring.ring_type);
    let chance = (ring.s + ring.m + ring.l + ring.xl + ringData.classBoost.reduce((a, b) => a+b))/4;

    ring.consumer = 100 - ring.premium - ring.sashimi - ring.trophy;
    ring.premium += ringData.gradeBoost[0]/100*ring.consumer;
    ring.sashimi += ringData.gradeBoost[1]/100*ring.premium;
    ring.trophy += ringData.gradeBoost[2]/100*ring.sashimi;
    let gradeMultiplier = 1 + ring.premium*0.005 + ring.sashimi*0.03 + ring.trophy*0.09;

    return {
        chance: Math.round(chance*10)/10,
        mult: Math.round(gradeMultiplier*10)/10
    };
}