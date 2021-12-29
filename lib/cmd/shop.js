// Handle "shop" Command
// # ----------------- #

const { MessageAttachment, MessageActionRow, MessageButton } = require('discord.js');

const api = require('../../api');
const db = require('../../db');
const logic = require('../logic');

const { createItemRingCanvas } = require('../misc/canvas.js');

module.exports.sendShopEquipmentCommand = async function(interaction, user) {
    // SHOP EQUIPMENT
    // Step 1 - Gather Shop Data (all static)
    const AquariumData = api.aquarium.getAquariumData(user.aquarium + 1);
    const RodData = api.equipment.getRodData(user.rod + 1);
    const LineData = api.equipment.getLineData(user.line + 1);
    const HookData = api.equipment.getHookData(user.hook + 1)
    const GloveData = user.level >= 20 ? api.equipment.getGloveData(user.gloves + 1) : false;
    const SwivelData = user.level >= 50 ? api.equipment.getSwivelData(user.swivel + 1) : false;

    // Step 2 - Embed Fields
    let embedFields = [];
    if (AquariumData) { embedFields.push(createShopField(user, AquariumData, 'Aquarium :truck:', 'Aquarium')); }
    if (RodData) { embedFields.push(createShopField(user, RodData, 'Fishing Rod :fishing_pole_and_fish:', 'Rod')); }
    if (LineData) { embedFields.push(createShopField(user, LineData, 'Fishing Line :thread:', 'Line')); }
    if (HookData) { embedFields.push(createShopField(user, HookData, 'Hook :hook:', 'Hook')); }
    if (GloveData) { embedFields.push(createShopField(user, GloveData, 'Gloves :gloves:', 'Gloves')); }
    if (SwivelData) { embedFields.push(createShopField(user, SwivelData, 'Swivel :chains:', 'Swivel')); }
    /*if (user.level >= 20) {
        const RingPackData = api.equipment.getRingPackData(user.level);
        // regular ring
        let purchaseable = user.coins >= RingPackData.regular.price;
        embedFields.push({
            name: `${purchaseable ? ':white_check_mark:' : ':credit_card:'}  Regular Ring Pack ${api.emoji.RINGPACK_REGULAR}`,
            value: `1 Random Ring - ${RingPackData.regular.price} coins ${purchaseable ? '`/buy ring`' : ''}`
        });
        // premium ring
        purchaseable = user.coins >= RingPackData.premium.price;
        embedFields.push({
            name: `${purchaseable ? ':white_check_mark:' : ':credit_card:'}  Premium Ring Pack ${api.emoji.RINGPACK_PREMIUM}`,
            value: `1 Random Ring - ${RingPackData.premium.price} coins ${purchaseable ? '`/buy ring`' : ''}`
        });
    }*/

    // Step 3 - Send Embed
    let embed = {
        color: logic.color.STATIC.shop,
        title: `Welcome to the Equipment Shop!`,
        author: {
            name: `${interaction.user.username}#${interaction.user.discriminator} (Lvl. ${user.level})`,
            icon_url: interaction.user.displayAvatarURL()
        },
        description: `You have ${user.coins} :coin:
*use \`/compare\` to help analyze items*\n\u200b`,
        fields: embedFields
    };
    interaction.reply({ embeds: [embed] });
}
function createShopField(user, data, title, suffix) {
    const unlocked = user.level >= data.level;
    const purchaseable = unlocked && user.coins >= data.price;
    return {
        name: `${purchaseable ? ':white_check_mark:' : (unlocked ? ':credit_card:' : ':lock:')}  ${title}`,
        value: `${logic.text.capitalizeWords(data.name)} ${suffix} - ${data.price} coins ${purchaseable ? ` \`/buy ${suffix.toLowerCase()}\`` : ''}${!unlocked ? `(unlocked at lvl. ${data.level})` : ''}`
    };
}

module.exports.sendShopRingsCommand = async function(interaction, user) {
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
            const [embed2, attachment] = await handleRingsBuyButton(user, PackData, packType);
            await i.update({ embeds: [embed, embed2], files: attachment ? [attachment] : [], components: [] });
        });

        collector.on('end', (collected, reason) => {
            if (reason === 'time') {
                interaction.editReply({ embeds: [embed], components: [] });
            }
        });
    });
}
async function handleRingsBuyButton(user, PackData, packType) {
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