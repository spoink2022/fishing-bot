// Handle "settings", "toggle" Commands
// # -------------------------------- #

const db = require('../../db');

const logic = require('../logic');

const { sendReply } = require('../misc/reply.js');

module.exports.sendSettingsCommand = async function(interaction, user) {
    // SETTINGS
    // Step 1 - Send Embed
    let embed = {
        color: logic.color.byPurchase(user),
        title: `Settings for ${interaction.author.username}`,
        author: {
            name: `${interaction.author.tag} (Lvl. ${interaction.author.level})`,
            icon_url: interaction.author.displayAvatarURL()
        },
        description: `See \`/help settings\` for more info.
\n${user.opted_in ? ':white_check_mark: Opted In' : ':no_entry_sign: Opted Out'}
${user.show_r_value ? ':white_check_mark: Show r-value' : ':no_entry_sign: Hide r-value'}`
    };
    sendReply(interaction, { embeds: [embed] });
}

module.exports.sendToggleCommand = async function(interaction, user, setting) {
    switch (setting) {
        case 'optin':
            toggleOptin(interaction, user);
            break;
        case 'r':
            toggleRValue(interaction, user);
            break;
        case undefined:
            sendReply(interaction, 'You must include the setting to be toggled!');
            break;
        default:
            sendReply(interaction, 'That is not a valid setting! See `/help settings` for a list of toggle commands.');
            break;
    }
}

async function toggleOptin(interaction, user) {
    const optedIn = !user.opted_in;

    await db.users.setColumns(user.userid, { opted_in: optedIn });

    let embed = {
        color: optedIn ? logic.color.STATIC.success : logic.color.STATIC.failure,
        title: `You are now opted ${optedIn ? 'in' : 'out'}!`,
        description: `Your game information can ${optedIn ? 'now' : 'no longer'} be viewed by other players.`
    };

    sendReply(interaction, { embeds: [embed]});
}

async function toggleRValue(interaction, user) {
    const showRValue = !user.show_r_value;

    await db.users.setColumns(user.userid, { show_r_value: showRValue });

    let embed = {
        color: showRValue ? logic.color.STATIC.success : logic.color.STATIC.failure,
        title: `R-Value toggled ${showRValue ? 'on' : 'off'}!`,
        description: `The r-value will ${showRValue ? 'now' : 'not'} be shown when fishing.`
    };

    sendReply(interaction, { embeds: [embed]});
}