// Handle "buy" Command
// # ---------------- #

const { MessageAttachment } = require('discord.js');

const api = require('../../api');
const db = require('../../db');
const logic = require('../logic');

const { createItemUpgradeCanvas } = require('../misc/canvas');
const { sendReply } = require('../misc/reply.js');

module.exports.sendBuyEquipmentCommand = async function(interaction, user, category) {
    // BUY {EQUIPMENT}
    // Step 0 - Adjust text (for message input)
    if (category.startsWith('extension ')) { category = category.substr(10) }
    
    // Step 1 - Fetch Variables
    let data;
    switch (category) {
        case 'aquarium':
            data = api.aquarium.getAquariumData(user.aquarium + 1);
            data.name = data.name.replace(/_/g, ' ');
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
        
        // Swivel Extensions
        case 'whale':
            if (user.whale_swivel) { return sendReply(interaction, 'You have already purchased the Whale Swivel Extension!'); }
            data = {
                name: 'whale swivel',
                level: 100,
                price: 500000,
                is_swivel_extension: true,
                message: 'Your swivel bonus will now apply to whales!'
            };
            break;
        case 'prestige':
            if (user.prestige_swivel) { return sendReply(interaction, 'You have already purchased the Prestige Swivel Extension!'); }
            data = {
                name: 'prestige swivel',
                level: 140,
                price: 10000000,
                is_swivel_extension: true,
                message: 'Your swivel bonus will now apply to all catches when prestige is turned on!'
            };
            break;
        default:
            break;
    }

    // Step 2 - Validate Entry Exists/Can Buy Equipment
    if (!data) { // not valid entry
        return sendReply(interaction, 'That item does not exist!');
    } else if (user.level < data.level) { // not unlocked
        return sendReply(interaction, `You must be at least **Lvl. ${data.level}** to purchase **${logic.text.capitalizeWords(`${data.name} ${category}`)}**!`);
    } else if (user.coins < data.price) { // too expensive
        return sendReply(interaction, `You must have at least **${data.price} coins** to purchase **${logic.text.capitalizeWords(`${data.name} ${category}`)}**!`);
    }

    // Step 3 - Update Database
    if (!data.is_swivel_extension) {
        let instructions = { coins: -data.price };
        instructions[category] = 1;
        await db.users.updateColumns(user.userid, instructions);
    } else {
        let columnName = data.name.replace(/ /g, '_');
        await db.users.setColumn(user.userid, columnName, true);
        await db.users.updateColumn(user.userid, 'coins', -data.price);
    }

    // Step 4 - Render Canvas
    const canvasBuffer = await createItemUpgradeCanvas(category, user[category]);
    const attachment = new MessageAttachment(canvasBuffer, `upgrade_${category}.png`);

    // Step 5 - Send Embed
    const bonusMessage = data.is_swivel_extension ? data.message + '\n' : '';

    let embed = {
        color: logic.color.STATIC.shop,
        title: `Purchased ${logic.text.capitalizeWords(`${data.name} ${category}`)}!`,
        author: {
            name: `${interaction.user.tag} (Lvl. ${user.level})`,
            icon_url: interaction.user.displayAvatarURL()
        },
        description: `${bonusMessage}Purchased for ${data.price} coins.\nYou now have ${user.coins - data.price} coins.`,
        image: {
            url: `attachment://upgrade_${category}.png`
        }
    };

    sendReply(interaction, { embeds: [embed], files: [attachment] });
}