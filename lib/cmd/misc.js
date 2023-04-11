// Handle "vote", "chum"  Command
// # ---------------------------------------------- #

const { MessageAttachment } = require('discord.js');

const api = require('../../api');
const db = require('../../db');
const logic = require('../logic');
const { capitalizeWords } = require('../logic/text');

const { createChumCanvas } = require('../misc/canvas.js');
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

module.exports.sendChumCommand = async function(interaction, user, baitList) {
    // CHUM
    // Step 1: Validate correct arguments
    if (baitList.length !== 4) {
        let s = 'You must specify exactly 4 baits to chum!';
        if (baitList.length > 4) { s += '\n\nFor baits with more than one word, use a dash instead of a space (e.g. "small-cutbait" instead of "small cutbait")'; }
        return sendReply(interaction, s);
    }
    baitList = baitList.map(s => s.replace(/ /g, '_').replace(/-/g, '_'));
    const BaitNames = api.bait.getAllBaitNames();
    for (let bait of baitList) {
        if (!BaitNames.includes(bait)) {
            return sendReply(interaction, `**${bait}** is not a valid regular bait!`);
        }
    }
    
    // Step 2: Check for inventory
    let baits = await db.bait.fetchAllBaits(user.userid);
    let baitsCopy = Object.assign({}, baits);
    for (let bait of baitList) {
        baitsCopy[bait] -= 10;
        if (baitsCopy[bait] < 0) {
            return sendReply(interaction, `You do not have enough ${bait.replace(/_/g, ' ')}!\
\nRequired: ${baits[bait] - baitsCopy[bait]}\nAvailable: ${baits[bait]}`);
        }
    }

    // Step 3: Update DB
    result = logic.game.getChumResult(baitList);
    instructions = {};
    for (let bait of [...new Set(baitList)]) {
        instructions[bait] = -(baits[bait] - baitsCopy[bait]);
    }
    instructions[result] = 4;
    await db.bait.updateColumns(user.userid, instructions);
    
    // Step 4: Render Canvas
    const canvasBuffer = await createChumCanvas(result);
    const attachment = new MessageAttachment(canvasBuffer, `${result}.png`);

    // Step 5: Send Embed
    let embed = {
        color: logic.color.byPurchase(user),
        title: `Gained: ${capitalizeWords(result.replace(/_/g, ' '))} x4`,
        author: {
            name: `${interaction.user.tag} (Lvl. ${user.level})`,
            icon_url: interaction.user.displayAvatarURL()
        },
        description: `You now have ${baits[result] + 4} ${result.replace(/_/g, ' ')}.\
\n\n**Cost**\
\n${[...new Set(baitList)].map(s => `${capitalizeWords(s.replace(/_/g, ' '))} x${baits[s] - baitsCopy[s]} (${baitsCopy[s]} left)`).join('\n')}`,
        image: {
            url: `attachment://${result}.png`
        }
    }

    sendReply(interaction, { embeds: [embed], files: [attachment] }).catch(err => handleMessageReplyError(err));
}

module.exports.sendPrestigeCommand = async function(interaction, user) {
    // PRESTIGE
    // Step 1: Check Validity
    if (user.level < 140) {
        return sendReply(interaction, 'You must be at least **Lvl. 140** to use this feature!');
    }

    // Step 2: Update Database
    let newPrestige = (user.prestige + 1) % 2;
    await db.users.setColumn(user.userid, 'prestige', newPrestige);

    // Step X: Send Embed
    let embed = {
        color: logic.color.byPurchase(user),
        title: `You have set your prestige level to Level ${newPrestige}!`,
        description: `Fish will now spawn with a size of **x${10**(3*newPrestige)}**`
    };
    sendReply(interaction, { embeds: [embed]}).catch(err => handleMessageReplyError(err));
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