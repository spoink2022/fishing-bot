// Handle "equipment" Command
// # ---------------------- #

const { MessageAttachment } = require('discord.js');

const api = require('../../api');
const db = require('../../db');
const logic = require('../logic');

const { getRingAverages } = require('../misc/calculations.js');
const { createEquipmentCanvas } = require('../misc/canvas.js');

module.exports.sendEquipmentCommand = async function(interaction, user) {
    // EQUIPMENT
    // Step 1 - Validate Command Call
    let mentionedUser = interaction.options.getUser('user') || interaction.user;
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

    // Step 2 - Fetch Information
    const clan = await db.clan.fetchClan(user.clan);

    const bannerID = await db.cosmetics.getEquippedCosmetic(user.userid, 0);

    const rodData = api.equipment.getRodData(user.rod);
    const lineData = api.equipment.getLineData(user.line);
    const hookData = api.equipment.getHookData(user.hook);
    const gloveData = user.glove !== 0 ? api.equipment.getGloveData(user.glove) : null;
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
            name: 'Glove :gloves:',
            value: `__${gloveData.name} Glove__\nChance: **${gloveData.chance}%**\nBonus: **+${gloveData.bonus}kg**`,
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
            value: `__${swivelData.name} Swivel__\nShark Bonus: **+${swivelData.bonus}kg**`,
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
            name: `${mentionedUser.username}#${mentionedUser.discriminator} (Lvl. ${user.level})`,
            icon_url: mentionedUser.displayAvatarURL()
        },
        fields: embedFields,
        image: {
            url: `attachment://${user.userid}_equipment.png`
        }
    };
    interaction.reply({ embeds: [embed], files: [attachment] });
}