// Handle "vote", "optin", "optout", "links"  Command
// # ---------------------------------------------- #

const api = require('../../api');
const db = require('../../db');
const logic = require('../logic');

const { handleMessageReplyError } = require('../misc/error.js');
const { sendReply } = require('../misc/reply.js');

module.exports.sendVoteCommand = async function(interaction, user) {
    // VOTE
    const timeRemaining = user.next_vote - Date.now();
    const canVote = timeRemaining < 0;
    let readyString = '';
    if (!canVote) { readyString = ` (ready in ${logic.text.millisToString(timeRemaining)})` }

    let embed = {
        color: logic.color.STATIC[canVote ? 'success' : 'yellow'],
        title: 'Vote for Big Tuna!',
        author: {
            name: `${interaction.user.tag} (Lvl. ${user.level})`,
            icon_url: interaction.user.displayAvatarURL()
        },
        description: `Immediately be able to fish again! :fishing_pole_and_fish:\n\nVote here${readyString}:\nhttps://top.gg/bot/803361191166607370/vote :link:`
    };
    sendReply(interaction, { embeds: [embed] }).catch(err => handleMessageReplyError(err));
}

// DEPRECATED
module.exports.sendOptInCommnad = async function(interaction, user) {
    // OPT IN
    if (user.opted_in) { return sendReply(interaction, 'You are already opted in!'); }
    await db.users.setColumns(user.userid, { opted_in: true });
    let embed = {
        color: logic.color.STATIC.success,
        title: 'You are now opted in!',
        description: 'Your game information can now be viewed by members of servers you are in.'
    };
    sendReply(interaction, { embeds: [embed] });
}

module.exports.sendOptOutCommnad = async function(interaction, user) {
    // OPT OUT
    if (!user.opted_in) { return sendReply(interaction, 'You are already opted out!'); }
    await db.users.setColumns(user.userid, { opted_in: false });
    let embed = {
        color: logic.color.STATIC.success,
        title: 'You are now opted out!',
        description: 'Your game information can no longer be viewed by other players.'
    };
    sendReply(interaction, { embeds: [embed] });
}