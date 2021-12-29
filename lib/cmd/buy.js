// Handle "buy" Command
// # ---------------- #

const { MessageAttachment, MessageActionRow, MessageButton } = require('discord.js');

const api = require('../../api');
const db = require('../../db');
const { rings } = require('../../db/misc_tables');
const logic = require('../logic');

const { createItemUpgradeCanvas, createItemRingCanvas } = require('../misc/canvas');

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

module.exports.sendBuyRingCommand = async function(interaction, user) {
    // BUY: RING
    // Step 1 - Validate Can Buy
    const userRings = await db.rings.getAllUserRings(user.userid);
    if (user.level < 20) {
        return interaction.reply('You must be at least **Lvl. 20** to purchase rings!');
    } else if (userRings.length >= 10) {
        return interaction.reply('You already have **10 rings** in your inventory! Sell some with `/sell ring`.');
    }

    // Step 2 - Fetch Variables
    const PackData = api.equipment.getRingPackData(user.level);

    // Step 3 - Send Shop Embed (Options)
    let regularButton = new MessageButton().setCustomId(`${interaction.id} regular`).setLabel('Regular Pack').setStyle('SECONDARY');
    let premiumButton = new MessageButton().setCustomId(`${interaction.id} premium`).setLabel('Premium Pack').setStyle('PRIMARY');
    if (user.coins < PackData.regular.price) { regularButton.setDisabled(true); }
    if (user.coins < PackData.premium.price) { premiumButton.setDisabled(true); }
    const row = new MessageActionRow().addComponents(regularButton, premiumButton);

    let embed = {
        color: logic.color.STATIC.shop,
        title: `Buy a Ring Pack?`,
        author: {
            name: `${interaction.user.username}#${interaction.user.discriminator} (Lvl. ${user.level})`,
            icon_url: interaction.user.displayAvatarURL()
        },
        description: `You have **${user.coins}** coins.`,
        fields: [
            {
                name: `Regular Ring Pack ${api.emoji.RINGPACK_REGULAR}`,
                value: `Price: ${PackData.regular.price} coins\nContains: 1 Ring`
            },
            {
                name: `Premium Ring Pack ${api.emoji.RINGPACK_PREMIUM}`,
                value: `Price: ${PackData.premium.price} coins\nContains: 1 Ring (better stats, better ring types)`
            }
        ]
    };
    interaction.reply({ embeds: [embed], components: [row] }).then(async () => {
        const filter = i => i.customId.split(' ')[0] === interaction.id;

        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 10000 });

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) {
                return i.reply({ content: 'That button is not for you!', ephemeral: true });
            }
            collector.stop();
            const packType = i.customId.split(' ')[1];
            const [embed2, attachment] = await handleBuyButton(user, PackData, packType);
            await i.update({ embeds: [embed, embed2], files: attachment ? [attachment] : [], components: [] });
        });

        collector.on('end', (collected, reason) => {
            if (reason === 'time') {
                interaction.editReply({ embeds: [embed], components: [] });
            }
        });
    });
}

async function handleBuyButton(user, PackData, packType) {
    // Step 1 - Re-Fetch Variables
    const price = PackData[packType].price;
    user = await db.users.fetchUser(user.userid);

    // Step 2 - Re-Validate Can Buy
    const userRings = await db.rings.getAllUserRings(user.userid);
    if (user.coins < price) {
        return [{
                color: logic.color.STATIC.failure,
                title: `You no longer have the **${price} coins** required to purchase a **${logic.text.capitalizeWords(packType)} Ring Pack**!`
        }, null];
    } else if (userRings.length >= 10) {
        return [{
            color: logic.color.STATIC.failure,
            title: 'You already have **10 rings** in your inventory!',
            desrciption: 'Sell some with `/sell ring`.'
        }, null];
    }

    // Step 3 - Update Database
    let ring = logic.generation.generateRing(PackData, packType);
    ring.userid = user.userid;
    const ringId = await db.rings.addRing(ring);
    if (userRings.length === 0) { await db.users.setColumns(user.userid, { ring: ringId }); }
    await db.users.updateColumns(user.userid, { coins: -price });

    // Step 4 - Render Canvas
    const canvasBuffer = await createItemRingCanvas(ring.ring_type);
    const attachment = new MessageAttachment(canvasBuffer, `${ring.ring_type}_ring.png`);

    // Step 5 - Send Embed
    let embed = {
        color: logic.color.STATIC.shop,
        title: `Got a${['a', 'e', 'i', 'o', 'u'].includes(ring.ring_type[0]) ? 'n' : ''} ${logic.text.capitalizeWords(ring.ring_type)} Ring!`,
        description: `...from ${packType} ring pack purchased for ${price} coins.
You now have ${user.coins - price} coins.
\n**Check ring details with \`/ring ${userRings.length + 1}\`!**`,
        image: {
            url: `attachment://${ring.ring_type}_ring.png`
        }
    };
    return [embed, attachment];
}