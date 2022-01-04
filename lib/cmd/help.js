// Handle "quickstart, help" Commands
// # ------------------------------ #

const api = require('../../api');
const logic = require('../logic');

module.exports.sendQuickstartCommand = async function(interaction, user) {
    let embed = {
        color: logic.color.STATIC.tuna,
        title: 'Quickstart Guide',
        description: `**Welcome to Big Tuna!**
This guide will walk you through everything you need to know until reaching Lvl. 10
\n**The "Fish" Command**
Use this command to get to know the game and work your way up to Lvl. 10!
:small_blue_diamond: Use it by typing \`/fish\` or \`.fish\`
:small_blue_diamond: Get coins and exp
:small_blue_diamond: Gain levels
:small_blue_diamond: Your best catch (per species) automatically gets sent to your aquarium
:small_blue_diamond: No cooldown until you reach Lvl. 10
*Your line will snap if your Rod, Line, or Hook cannot support the weight of the fish!*
\n**Useful Commands**
\`/help\` - View the general help menu
\`/aquarium\` - View your best catch (per species) and passively earn coins
\`/collect\` - Collect the coins from your aquarium
\`/shop\` - Upgrade your equipment
\`/equipment\` - View your equipment
\`/stats player\` - View your personal profile, including coins and exp
\nFeel free to explore the other 90% of commands, but until reaching Lvl. 10, this is all you really need. Happy Fishing!`
    };
    interaction.reply({ embeds: [embed] })
}

module.exports.sendHelpCommand = async function(interaction, user) {
    interaction.reply('help');
}