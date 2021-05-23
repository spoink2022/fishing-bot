/* ALL POSSIBLE EVENTS

- decreasedFishingCooldown

*/

module.exports = function(varType, varVal, currentEvent) {
    if (!currentEvent) { return varVal; }

    if (varType === 'rodCooldown') {
        if (currentEvent.type === 'decreasedFishingCooldown') {
            return varVal * parseFloat(currentEvent.params);
        }
    }
}