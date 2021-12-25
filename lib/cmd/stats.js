const api = require('../../api');
const db = require('../../db');
const logic = require('../logic');
const calculations = require('../misc/calculations.js');

module.exports.sendStatsCommand = async function(interaction, user) {
    // STATS
    // Step 1 - Validate User Information
    let mentionedUser = interaction.options._hoistedOptions[0] ? interaction.options._hoistedOptions[0].user : interaction.user;
    if (mentionedUser && mentionedUser.id !== interaction.user.id) {
        if (mentionedUser.bot) {
            return interaction.reply(`**${mentionedUser.username}** is a bot and cannot have a Big Tuna account!`);
        }
        user = await db.users.fetchUser(mentionedUser.id);
        if (!user) {
            return interaction.reply(`**${mentionedUser.username}** has not used Big Tuna before!`);
        } else if (!user.opted_in) {
            return interaction.reply(`**${mentionedUser.username}** is not opted in! They must use the \`optin\` command to make their stats publicy visible.`);
        }
    }

    // Step 2 - Fetch User Variables
    const expRequired = api.leveldata.getPlayerLevelInfo(user.level).expRequired;

    // Step 3 - Send Embed
    let embed = {
        color: logic.color.byPurchase(user),
        title: `Stats for ${mentionedUser.username}`,
        author: {
            name: `${interaction.user.username}#${interaction.user.discriminator}`,
            icon_url: interaction.user.displayAvatarURL()
        },
        description: `${user.opted_in ? ':white_check_mark: Opted In' : ':no_entry_sign: Opted Out (use the `optin` command to make your stats public)'}
:lollipop: ${user.lollipops} Quest Point${user.lollipops !== 1 ? 's' : ''}
:coin: ${user.coins} Coin${user.coins !== 1 ? 's' : ''}
:star2: Level ${user.level}
:star: ${user.exp}/${expRequired} Exp
\n:fishing_pole_and_fish: Fish Caught: ${user.fish_caught}
:scales: Weight Caught: ${user.weight_caught}
:map: Current Location: ${user.location}
:earth_americas: Unlocked Locations: 1-${Math.floor(user.level/10)+1}
${user.big_supporter > 1 ? `:label: ${user.big_supporter} Extra Premium Supporter${user.big_supporter !== 1 ? 's' : ''} (see \`giftpremium\` command)` : ''}
${user.custom_fish > 0 ? `:scroll: ${user.custom_fish} Custom Fish Server Gift${user.custom_fish !== 1 ? 's' : ''} (see \`redeem\` command)` : ''}`
    };
    interaction.reply({ embeds: [embed] });
}