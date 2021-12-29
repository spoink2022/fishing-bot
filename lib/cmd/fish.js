const db = require('../../db');
const calculations = require('../misc/calculations.js');

module.exports.sendFishCommand = async function(interaction, msg, args, user) {
    // FISH
    // Step 1 - Check if commmand can be run
    return interaction.reply('POP');

    const clan = await db.clan.fetchClan(user.clanId);
    const currentEvent = await db.events.getCurrentEvent();
    const remainingCooldown = calculations.getRemainingCooldown(user, clan, currentEvent);
}