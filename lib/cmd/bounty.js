// Handle "bounty" Command
// # ------------------- #

const { MessageAttachment } = require('discord.js');

const db = require('../../db');
const logic = require('../logic');

const { createBountyCanvas } = require('../misc/canvas.js');
const { sendReply } = require('../misc/reply.js');

module.exports.sendBountyCommand = async function(interaction, user) {
    // BOUNTY
    // Step 1 - Validate User Level
    if (user.level < 10) {
        return sendReply(interaction, 'You must reach **Lvl. 10** before accessing the weekly bounty!');
    }

    // Step 2 - Fetch Variables
    const bounty = await db.bounty.getCurrentEntry();
    const complete = user.bounty === bounty.id;

    // Step 3 - Render Canvas
    const canvasBuffer = await createBountyCanvas(bounty.fish, bounty.tier, complete);
    const attachment = new MessageAttachment(canvasBuffer, `bounty_${bounty.fish}_${complete ? '' : 'in'}complete.png`);

    // Step 4 - Send Embed
    let embed = {
        color: logic.color.STATIC[complete ? 'bountyComplete' : 'bountyIncomplete'],
        title: `Bounty - ${logic.text.epochToDateString(bounty.start_time)}${complete ? ' (Complete)' : ''}`,
        author: {
            name: `${interaction.user.tag} (Lvl. ${user.level})`,
            icon_url: interaction.user.displayAvatarURL()
        },
        description: `*Players completed: ${bounty.completed}*\n\u200b`,
        fields: [
            { name: 'Species', value: logic.text.capitalizeWords(bounty.fish.replace(/_/g, ' ')), inline: true },
            { name: 'Requirements', value: `${bounty.tier}-Tier (or higher)`, inline: true },
            { name: 'Reward', value: `${bounty.reward} :lollipop:`, inline: true }
        ],
        image: {
            url: `attachment://bounty_${bounty.fish}_${complete ? '' : 'in'}complete.png`
        },
        footer: { text: `New bounty in ${logic.text.millisToString(bounty.end_time - Date.now())}`}
    };

    sendReply(interaction, { embeds: [embed], files: [attachment] });
}