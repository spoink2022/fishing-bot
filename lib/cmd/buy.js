// Handle "buy" Command
// # ---------------- #

const { MessageAttachment } = require('discord.js');

const api = require('../../api');
const db = require('../../db');
const logic = require('../logic');

const { createItemUpgradeCanvas } = require('../misc/canvas');

module.exports.sendBuyEquipmentCommand = async function(interaction, user) {
    // BUY {EQUIPMENT}
    // Step 1 - Fetch Variables
    const itemType = interaction.options.getSubcommand();
    let data;
    switch (itemType) {
        case 'aquarium':
            data = api.aquarium.getAquariumData(user.aquarium + 1);
            break;
        case 'rod':
            data = api.equipment.getRodData(user.rod + 1);
            break;
        case 'line':
            data = api.equipment.getLineData(user.line + 1);
            break;
        case 'hook':
            data = api.equipment.getHookData(user.hook + 1);
            break;
        case 'gloves':
            data = api.equipment.getGloveData(user.gloves + 1);
            break;
        case 'swivel':
            data = api.equipment.getSwivelData(user.swivel + 1);
            break;
        default:
            break;
    }

    // Step 2 - Validate Entry Exists/Can Buy Equipment
    if (!data) { // not valid entry
        return interaction.reply('That item does not exist!');
    } else if (user.level < data.level) { // not unlocked
        return interaction.reply(`You must be at least **Lvl. ${data.level}** to purchase **${logic.text.capitalizeWords(`${data.name} ${itemType}`)}**!`);
    } else if (user.coins < data.price) { // too expensive
        return interaction.reply(`You must have at least **${data.price} coins** to purchase **${logic.text.capitalizeWords(`${data.name} ${itemType}`)}**!`);
    }

    // Step 3 - Update Database
    let instructions = { coins: -data.price };
    instructions[itemType] = 1;
    await db.users.updateColumns(user.userid, instructions);

    // Step 4 - Render Canvas
    const canvasBuffer = await createItemUpgradeCanvas(itemType, user[itemType]);
    const attachment = new MessageAttachment(canvasBuffer, `upgrade_${itemType}.png`);

    // Step 5 - Send Embed
    let embed = {
        color: logic.color.STATIC.shop,
        title: `Purchased ${logic.text.capitalizeWords(`${data.name} ${itemType}`)}!`,
        author: {
            name: `${interaction.user.username}#${interaction.user.discriminator} (Lvl. ${user.level})`,
            icon_url: interaction.user.displayAvatarURL()
        },
        description: `Purchased for ${data.price} coins.\nYou now have ${user.coins - data.price} coins.`,
        image: {
            url: `attachment://upgrade_${itemType}.png`
        }
    };

    interaction.reply({ embeds: [embed], files: [attachment] });
}