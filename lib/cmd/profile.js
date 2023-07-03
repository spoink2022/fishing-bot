// Handle "equipment", "bait" Command
// # ------------------------------ #

const { MessageAttachment } = require('discord.js');

const api = require('../../api');
const db = require('../../db');
const logic = require('../logic');

const { getTutorialFiveEmbed } = require('./tutorial.js');

const { getCooldownTime, getRingAverages } = require('../misc/calculations.js');
const { createEquipmentCanvas } = require('../misc/canvas.js');
const { handleMessageReplyError } = require('../misc/error.js');
const { sendReply } = require('../misc/reply.js');

module.exports.sendBaitCommand = async function(interaction, user) {
    // BAIT
    // Step 1 - Validate User Level
    if (user.level < 10) { return sendReply(interaction, 'You must reach **Lvl. 10** before you can use baits!'); }
    
    // Step 2 - Fetch Data
    let embedFields = [
        { name: 'Baits', value: '', inline: true },
        { name: 'Chum Baits', value: '', inline: true }
    ];
    const baits = await db.bait.fetchAllBaits(user.userid);
    const BaitNames = api.bait.getAllBaitNames();
    for (const name of BaitNames) {
        if (baits[name] !== 0) {
            embedFields[0].value += `- ${name.replace(/_/g, ' ')} **x${baits[name]}**\n`;
        }
    }
    if (embedFields[0].value == '') { embedFields[0].value = 'None'; }

    const ChumBaitNames = api.bait.getAllChumBaitNames();
    for (const name of ChumBaitNames) {
        if (baits[name] !== 0) {
            embedFields[1].value += `- ${name.replace(/_/g, ' ')} **x${baits[name]}**\n`;
        }
    }
    if (embedFields[1].value == '') {
        if (user.level < 40) { embedFields[1].value = 'Unlocks at Lvl. 40'; }
        else { embedFields[1].value = 'None'; }
    }

    // Step 3 - Send Embed
    let embed = {
        color: logic.color.byPurchase(user),
        title: 'Bait Inventory',
        author: {
            name: `${interaction.user.tag} (Lvl. ${user.level})`,
            icon_url: interaction.user.displayAvatarURL()
        },
        fields: embedFields
    };
    sendReply(interaction, { embeds: [embed] });
}

module.exports.sendCooldownsCommand = async function(interaction, user) {
    // COOLDOWNS
    // Step 1 - Fetch Variables
    user.cooldown = parseInt(user.cooldown);
    const clan = await db.clan.fetchClanByUserid(user.userid);
    const currentEvent = await db.events.getCurrentEvent();
    const cooldownTime = user.level < 10 ? 0 : getCooldownTime(user, clan, currentEvent);
    const timeToFish = user.cooldown + cooldownTime - Date.now();
    const timeToVote = Math.max(user.next_vote - Date.now(), 0);
    let accumulationString = '';
    if (user.big_supporter >= 1) {
        const capacity = Math.ceil(cooldownTime/60000);
        let minutesAccumulated = Math.min(Math.max(Math.floor(-timeToFish/60000), 0), capacity);
        // verifies precision for information display (acts true even with decimal cds)
        if (-timeToFish >= cooldownTime) { minutesAccumulated = capacity; }
        let emoji = timeToFish > 0 ? ':pause_button:' : (minutesAccumulated === capacity ? ':white_check_mark:' : ':arrows_clockwise:');
        accumulationString = `\n**Accumulated Time**: (${minutesAccumulated}/${capacity} minutes) ${emoji}`;
    }

    // Step 2 - Send Embed
    let embed = {
        color: logic.color.byPurchase(user),
        title: 'Cooldowns',
        author: {
            name: `${interaction.user.tag} (Lvl. ${user.level})`,
            icon_url: interaction.user.displayAvatarURL()
        },
        description: `**Fish**: ${timeToFish > 0 ? logic.text.millisToString(timeToFish) + ' :clock12:' : 'Ready! :white_check_mark:'}${accumulationString}
**Vote**: ${timeToVote ? logic.text.millisToString(timeToVote) + ' :clock12:' : 'Ready! :white_check_mark:'}`
    };
    sendReply(interaction, { embeds: [embed] });
}

module.exports.sendEquipmentCommand = async function(interaction, user, mentionedUser) {
    // EQUIPMENT
    // Step 1 - Validate Command Call
    if (mentionedUser && mentionedUser.id !== interaction.user.id) {
        if (mentionedUser.bot) {
            return sendReply(interaction, `**${mentionedUser.username}** is a bot and cannot have a Big Tuna account!`);
        }
        user = await db.users.fetchUser(mentionedUser.id);
        if (!user) {
            return sendReply(interaction, `**${mentionedUser.username}** has not used Big Tuna before!`);
        } else if (!user.opted_in) {
            return sendReply(interaction, `**${mentionedUser.username}** is not opted in! They must use the \`/optin\` command to make their stats publicy visible.`);
        }
    }

    // Step 2 - Fetch Information
    const clan = await db.clan.fetchClanByUserid(user.userid);

    const bannerID = await db.skins.getEquippedSkin(user.userid, 0);

    const rodData = api.equipment.getRodData(user.rod);
    const lineData = api.equipment.getLineData(user.line);
    const hookData = api.equipment.getHookData(user.hook);
    const gloveData = user.glove !== 0 ? api.equipment.getGloveData(user.gloves) : null;
    const ring = user.ring !== 0 ? await db.rings.getRing(user.ring) : null;
    let ringData, ringAverages, ringType;
    if (ring) {
        ringData = api.equipment.getRingData(ring.ring_type);
        ringAverages = getRingAverages(ring);
        ringType = ring.ring_type;
    }
    const swivelData = user.swivel !== 0 ? api.equipment.getSwivelData(user.swivel) : null;
    const maxWeight = Math.min(rodData.maxWeight, lineData.maxWeight, hookData.maxWeight);
    const pctIncrease = logic.clan.getMaxWeightIncrease(clan);

    // Step 3 - Render Canvas
    const canvasBuffer = await createEquipmentCanvas(user, ringType, bannerID);
    const attachment = new MessageAttachment(canvasBuffer, `${user.userid}_equipment.png`);

    // Step 4 - Send Embed
    let embedFields = [
        {
            name: 'Fishing Rod :fishing_pole_and_fish:',
            value: `__${rodData.name} Rod__\nMax Weight: **${logic.text.kgToWeight(rodData.maxWeight)}**\nCooldown Time: **${Math.round(rodData.cooldown/60000)}m**`,
            inline: true
        },
        {
            name: 'Fishing Line :thread:',
            value: `__${lineData.name} Line__\nMax Weight: **${logic.text.kgToWeight(lineData.maxWeight)}**\nBonus Exp: **+${lineData.bonus}**`,
            inline: true
        },
        {
            name: 'Hook :hook:',
            value: `__${hookData.name} Hook__\nMax Weight: **${logic.text.kgToWeight(hookData.maxWeight)}**\nCoin Bonus: **+${Math.round((hookData.multiplier-1)*100)}%**`,
            inline: true
        }
    ];
    if (gloveData) {
        embedFields.push({
            name: 'Gloves :gloves:',
            value: `__${gloveData.name} Gloves__\nChance: **${gloveData.chance}%**\nBonus: **+${logic.text.kgToWeight(gloveData.bonus)}**`,
            inline: true
        });
    }
    if (ringData){
        embedFields.push({
            name: 'Ring :ring:',
            value: `__${logic.text.capitalizeWords(ring.ring_type)} Ring__\nAvg Chance: **${ringAverages.chance}%**\nAvg Multiplier: **x${ringAverages.mult}**`,
            inline: true
        });
    }
    if (swivelData){
        embedFields.push({
            name: 'Swivel :chains:',
            value: `__${swivelData.name} Swivel__\nShark Bonus: **+${logic.text.kgToWeight(swivelData.bonus)}**\
${user.whale_swivel ? `\nWhale Bonus: **+${swivelData.bonus}kg**` : ''}`,
            inline: true
        });
    }
    if (embedFields.length === 5) {
        embedFields.push({ name: '\u200b', value: '\u200b', inline: true });
    }

    let embed = {
        color: logic.color.byPurchase(user),
        title: `Fishing Equipment (Max ${logic.text.kgToWeight(maxWeight)}${pctIncrease !== 0 ? ` + ${logic.text.kgToWeight(maxWeight*pctIncrease/100)}` : ''})`,
        author: {
            name: `${mentionedUser.tag} (Lvl. ${user.level})`,
            icon_url: mentionedUser.displayAvatarURL()
        },
        fields: embedFields,
        image: {
            url: `attachment://${user.userid}_equipment.png`
        }
    };

    let embedArr = [embed];

    if (user.tutorial === 4) {
        embedArr.push(await getTutorialFiveEmbed(interaction, user));
    }

    sendReply(interaction, { embeds: embedArr, files: [attachment] }).catch(err => handleMessageReplyError(err));
}