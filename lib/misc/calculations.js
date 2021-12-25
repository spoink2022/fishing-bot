// Gameplay Calculations
// # ----------------- #

const api = require('../../api');
const logic = require('../logic');

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