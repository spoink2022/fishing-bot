// Handle "vote" Command
// # ----------------- #

const api = require('../../api');
const db = require('../../db');
const logic = require('../logic');

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
            name: `${interaction.user.username}#${interaction.user.discriminator} (Lvl. ${user.level})`,
            icon_url: interaction.user.displayAvatarURL()
        },
        description: `Immediately be able to fish again! :fishing_pole_and_fish:\n\nVote here${readyString}:\nhttps://top.gg/bot/803361191166607370/vote :link:`
    };
    interaction.reply({ embeds: [embed] });
}