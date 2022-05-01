// Handle "shop" Command
// # ----------------- #

const { MessageAttachment, MessageActionRow, MessageButton, MessageSelectMenu } = require('discord.js');

const api = require('../../api');
const db = require('../../db');
const logic = require('../logic');

const { createItemRingCanvas } = require('../misc/canvas.js');
const { sendReply } = require('../misc/reply.js');

module.exports.sendRevokeCommand = async function(interaction) {
    return;
    // REVOKE (TEMPORARY COMMAND)
    // Step 1 - Validate User/Guild Requirements
    if (interaction.channel.type !== 'GUILD_TEXT') { return sendReply(interaction, 'The Server Shop may only be accessed from servers!'); }
    
    let server = await db.servers.fetchServer(interaction.guild.id);
    if (server.premium_tier === 0) { return sendReply(interaction, 'This server is not a :sparkles: **Premium Server**! See \`/help supporter\` for more info!'); }

    if (interaction.user.id !== interaction.guild.ownerId) {
        return sendReply(interaction, 'Only the owner of the server can use this command!');
    }
    
    // Step 2 - Update Database
    await db.servers.updateColumns(server.serverid, { premium_tier: -1 });
    await db.users.updateColumns(interaction.user.id, { custom_fish: 1 });

    // Step 3 - Send Message
    return sendReply(interaction, 'Success! Premium Status has been moved back to your account!');
}

module.exports.sendServerShopCommand = async function(interaction, user) {
    // SHOP: SERVER
    // Step 1 - Validate User Level/Guild Requirements
    if (interaction.channel.type !== 'GUILD_TEXT') { return sendReply(interaction, 'The Server Shop may only be accessed from servers!'); }
    
    let server = await db.servers.fetchServer(interaction.guild.id);
    if (server.premium_tier === 0) { return sendReply(interaction, 'This server is not a :sparkles: **Premium Server**! See \`/help supporter\` for more info!'); }
    
    if (user.level < 10) { return sendReply(interaction, 'You must reach **Lvl. 10** before accessing the Server Shop!'); }
    
    // Step 2 - Fetch Variables
    const epochWeek = Math.floor((Date.now() - 4*86400000) / 604800000); // offset 4 days to align with bounty
    if (server.shop_week < epochWeek) { // generate a new servershop
        const newShopEntries = logic.generation.generateServerShop(server.premium_tier);
        server = await db.servers.setColumns(server.serverid, { shop_entries: newShopEntries, shop_week: epochWeek });
    }
    if (server.premium_tier > server.shop_entries.length) { // fill in remaining components of servershop
        const additionalShopEntries = logic.generation.generateServerShop(server.premium_tier - server.shop_entries.length);
        server = await db.servers.setColumns(server.serverid, { shop_entries: server.shop_entries.concat(additionalShopEntries) });
    }
    let shopClaims = [];
    if (user.shop_week < epochWeek) { // renew users claimability
        await db.users.setColumn(user.userid, 'shop_week', epochWeek);
        await db.users.resetServerShopClaims(user.userid, server.serverid);
    } else {
        shopClaims = await db.users.getServerShopClaims(user.userid, server.serverid);
    }
    shopClaims = shopClaims.map(obj => obj.deal);

    // Step 3 - Parse Server Shop
    server.shop_entries = server.shop_entries.map(entry => {
        const arr = entry.split(' ');
        return { bait: arr[0], qt: parseInt(arr[1]), price: parseInt(arr[2]) };
    });

    // Step 4 - Send Embed
    const buttons = Array.from(Array(server.premium_tier).keys()).map(i => {
        const b = new MessageButton().setCustomId(`${interaction.id} ${i+1}`).setLabel((server.shop_entries[i].price === 0 ? 'Claim' : 'Buy') + ` #${i+1}`).setStyle('SECONDARY');
        if (shopClaims.includes(i+1) || user.lollipops < server.shop_entries[i].price) {
            b.setDisabled(true);
        }
        return b;
    });

    let rows = [new MessageActionRow().addComponents(buttons.slice(0, 3))];
    if (server.premium_tier >= 4) {
        rows.push(new MessageActionRow().addComponents(buttons.slice(3, 6)));
    }
    if (server.premium_tier >= 7) {
        rows.push(new MessageActionRow().addComponents(buttons.slice(6)));
    }

    const embedFields = server.shop_entries.map((entry, i) => {
        const strike = shopClaims.includes(i+1) ? '~~' : '';
        return {
            name: `${strike}#${i+1} - ${logic.text.capitalizeWords(entry.bait.replace(/_/g, ' '))} x${entry.qt}${strike}`,
            value: `${strike}Price: ${entry.price === 0 ? 'FREE' : `${entry.price} :lollipop:`}${strike}`,
            inline: true
        };
    });
    if (server.premium_tier % 3 === 2) {
        embedFields.push({ name: '\u200b', value: '\u200b', inline: true });
    }
    
    let embed = {
        color: logic.color.byServerPurchase(server),
        title: 'Welcome to the Server Shop!',
        author: {
            name: `${interaction.user.tag} (Lvl. ${user.level})`,
            icon_url: interaction.user.displayAvatarURL()
        },
        description: `You have ${user.lollipops} :lollipop:\nYou may only claim each deal once a week.
${server.premium_tier === 9 ? '' : 'Redeem to this server again to unlock another deal.\n'}\u200b`,
        fields: embedFields,
        footer: {
            text: `New deal in ${logic.text.millisToString((epochWeek + 1) * 604800000 - Date.now() + 4*86400000)}`
        }
    };
    let embedArr = [embed];
    sendReply(interaction, { embeds: embedArr, components: rows }).then(async (sentMessage) => {
        const filter = i => i.customId.split(' ')[0] === interaction.id;

        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 20000 });

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) {
                return i.reply({ content: 'That button is not for you!', ephemeral: true });
            }
            embedArr.push(await handleServerBuyButton(user, server, parseInt(i.customId.split(' ')[1]), rows, embedArr)); // function edits rows & embedArr
            if (embedArr.length === 10) {
                collector.stop();
                rows = [];
            } else {
                collector.resetTimer();
            }
            await i.update({ embeds: embedArr, components: rows });
        });

        collector.on('end', (collected, reason) => {
            if (reason === 'time') {
                if (interaction.constructor.name === 'Message') { return sentMessage.edit({ embeds: embedArr, components: [] }); }
                interaction.editReply({ embeds: embedArr, components: [] });
            }
        });
    });
}
async function handleServerBuyButton(user, server, deal, rows, embedArr) {
    // Step 1 - Re-Fetch Variables/Initialize Variables
    user = await db.users.fetchUser(user.userid);
    server = await db.servers.fetchServer(server.serverid);

    const epochWeek = Math.floor((Date.now() - 4*86400000) / 604800000); // offset 4 days to align with bounty
    if (server.shop_week < epochWeek) { // generate a new servershop
        const newShopEntries = logic.generation.generateServerShop(server.premium_tier);
        server = await db.servers.setColumns(server.serverid, { shop_entries: newShopEntries, shop_week: epochWeek });
    }

    server.shop_entries = server.shop_entries.map(entry => {
        const arr = entry.split(' ');
        return { bait: arr[0], qt: parseInt(arr[1]), price: parseInt(arr[2]) };
    });
    let bait = server.shop_entries[deal-1].bait;
    let qt = server.shop_entries[deal-1].qt;
    let price = server.shop_entries[deal-1].price;

    let shopClaims;
    if (user.shop_week < epochWeek) { // renew users claimability
        await db.users.setColumn(user.userid, 'shop_week', epochWeek);
        shopClaims = await db.users.resetServerShopClaims(user.userid, server.serverid);
    } else {
        shopClaims = await db.users.getServerShopClaims(user.userid, server.serverid);
    }
    shopClaims = shopClaims.map(obj => obj.deal);

    // Step 2 - Re-Validate Can Buy
    if (shopClaims.includes(deal)) {
        rows[Math.floor((deal-1)/3)].components[(deal-1)%3].setDisabled(true);
        embedArr[0].fields[deal-1].name = '~~' + embedArr[0].fields[deal-1].name + '~~';
        embedArr[0].fields[deal-1].value = '~~' + embedArr[0].fields[deal-1].value + '~~';
        return {
            color: logic.color.STATIC.failure,
            title: 'You have already claimed this deal!'
        };
    }
    if (user.lollipops < price) {
        rows[Math.floor((deal-1)/3)].components[(deal-1)%3].setDisabled(true);
        return {
            color: logic.color.STATIC.failure,
            title: `You no longer have the **${price}** :lollipop: required to purchase this!`
        };
    }

    // Step 3 - Adjust old embed and buttons
    shopClaims.push(deal);

    for (let i=1; i<=server.premium_tier; i++) {
        if ((!(shopClaims.includes(i)) && user.lollipops - price < server.shop_entries[i-1].price) || shopClaims.includes(i)) {
            rows[Math.floor((i-1)/3)].components[(i-1)%3].setDisabled(true);
        }
    }

    embedArr[0].description = `You have ${user.lollipops} :lollipop:\nYou may only claim each deal once a week.
${server.premium_tier === 9 ? '' : 'Redeem to this server again to unlock another deal.\n'}\u200b`;
    embedArr[0].fields[deal-1].name = '~~' + embedArr[0].fields[deal-1].name + '~~';
    embedArr[0].fields[deal-1].value = '~~' + embedArr[0].fields[deal-1].value + '~~';

    // Step 4 - Update Database
    await db.users.createServerShopClaim(user.userid, server.serverid, deal);
    const newBaitAmount = await db.bait.updateColumn(user.userid, bait, qt);
    if (price !== 0) { await db.users.updateColumns(user.userid, { lollipops: -price }); }

    // Step 5 - Send Embed
    let embed = {
        color: logic.color.STATIC.shop,
        title: `${price === 0 ? 'Claimed' : 'Purchased'} ${qt} ${logic.text.capitalizeWords(bait.replace(/_/g, ' '))}${price === 0 ? '!' : ` for ${price} :lollipop:`}`
    };
    return embed;
}

module.exports.sendBaitShopCommand = async function(interaction, user) {
    // SHOP: BAIT
    // Step 1 - Validate User Level
    if (user.level < 10) {
        return sendReply(interaction, 'You must reach **Lvl. 10** before accessing baits!');
    }

    // Step 2 - Fetch Variables
    const entry = await db.baitShop.getCurrentEntry();

    // Step 3 - Send Embed
    let buttons = [], embedFields = [];
    for (let i=1; i<=3; i++) {
        buttons.push(new MessageButton().setCustomId(`${interaction.id} ${i}`).setLabel(`Buy #${i}`).setStyle('SECONDARY'));
        if (user.lollipops < entry[`price_${i}`]) { buttons[i-1].setDisabled(true); }
        embedFields.push({
            name: `\`#${i}\` ${logic.text.capitalizeWords(entry[`option_${i}`].replace(/_/g, ' '))} x${entry[`qt_${i}`]}`,
            value: `Price: ${entry[`price_${i}`]} :lollipop:`
        });
    }
    let row = new MessageActionRow().addComponents(buttons);
    let embedArr = [{
        color: logic.color.STATIC.shop,
        title: 'Welcome to the Bait Shop!',
        author: {
            name: `${interaction.user.tag} (Lvl. ${user.level})`,
            icon_url: interaction.user.displayAvatarURL()
        },
        description: `You have ${user.lollipops} :lollipop:\n\u200b`,
        fields: embedFields,
        footer: { text: `New baits in ${logic.text.millisToString(entry.end_time - Date.now())}` }
    }];

    sendReply(interaction, { embeds: embedArr, components: [row] }).then(async (sentMessage) => {
        const filter = i => i.customId.split(' ')[0] === interaction.id;

        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 30000 });

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) {
                return i.reply({ content: 'That button is not for you!', ephemeral: true });
            }
            embedArr.push(await handleBaitShopBuyButton(user, entry, i.customId.split(' ')[1], row));
            if (embedArr.length === 10) {
                collector.stop();
            } else {
                collector.resetTimer();
            }
            const rowArr = embedArr.length === 10 ? [] : [row];
            await i.update({ embeds: embedArr, components: rowArr });
        });

        collector.on('end', (collected, reason) => {
            if (reason === 'time') {
                if (interaction.constructor.name === 'Message') { return sentMessage.edit({ embeds: embedArr, components: [] }); }
                interaction.editReply({ embeds: embedArr, components: [] });
            }
        });
    });
}
async function handleBaitShopBuyButton(user, entry, option, actionRow) {
    // Step 1 - Re-Fetch Variables/Initialize Variables
    user = await db.users.fetchUser(user.userid);
    
    const baitName = entry[`option_${option}`];
    const qt = entry[`qt_${option}`];
    const price = entry[`price_${option}`];

    // Step 2 - Update actionRow/Re-Validate Can Buy
    for (let i=1; i<=3; i++) {
        if (user.lollipops - price < entry[`price_${i}`]) {
            actionRow.components[i-1].setDisabled(true);
        }
    }
    if (user.lollipops < price) {
        return {
            color: logic.color.STATIC.failure,
            title: `You no longer have the **${price}** :lollipop: required to purchase **Option ${option}**!`
        };
    }

    // Step 3 - Update Database
    const newBaitAmount = await db.bait.updateColumn(user.userid, baitName, qt);
    await db.users.updateColumns(user.userid, { lollipops: -price });

    // Step 4 - Send Embed
    let embed = {
        color: logic.color.STATIC.shop,
        title: `Purchased ${qt} ${logic.text.capitalizeWords(baitName.replace(/_/g, ' '))} for ${price} :lollipop:`,
        description: `You now have ${user.lollipops - price} :lollipop:
You now have ${newBaitAmount} ${logic.text.capitalizeWords(baitName.replace(/_/g, ' '))}`
    };
    return embed;
}

module.exports.sendShopCommand = async function(interaction, user) {
    // SHOP: EQUIPMENT
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

    // Step 3 - Rings (Lvl. 20+)
    let rowArr = [], PackData = null;
    if (user.level >= 20) {
        PackData = api.equipment.getRingPackData(user.level);

        embedFields.push({
            name: `${user.coins < PackData.regular.price ? ':credit_card:' : ':white_check_mark:'}  Regular Ring Pack ${api.emoji.RINGPACK_REGULAR}`,
            value: `1 Random Ring - ${PackData.regular.price} coins`
        });
        embedFields.push({
            name: `${user.coins < PackData.premium.price ? ':credit_card:' : ':white_check_mark:'}  Premium Ring Pack ${api.emoji.RINGPACK_PREMIUM}`,
            value: `1 Random Ring (better stats/types) - ${PackData.premium.price} coins`
        });

        let regularButton = new MessageButton().setCustomId(`${interaction.id} regular`).setLabel('Buy Ring').setStyle('SECONDARY');
        let premiumButton = new MessageButton().setCustomId(`${interaction.id} premium`).setLabel('Buy Premium Ring').setStyle('PRIMARY');
        if (user.coins < PackData.regular.price) { regularButton.setDisabled(true); }
        if (user.coins < PackData.premium.price) { premiumButton.setDisabled(true); }
        rowArr = [new MessageActionRow().addComponents(regularButton, premiumButton)];
    }

    // Step 4 - Send Embed
    let embed = {
        color: logic.color.STATIC.shop,
        title: `Welcome to the Equipment Shop!`,
        author: {
            name: `${interaction.user.tag} (Lvl. ${user.level})`,
            icon_url: interaction.user.displayAvatarURL()
        },
        description: `You have ${user.coins} :coin:
*use \`/info\` to help analyze items*\n\u200b`,
        fields: embedFields
    };
    sendReply(interaction, { embeds: [embed], components: rowArr }).then(async (sentMessage) => {
        if (user.level < 20) { return; }
        const filter = i => i.customId.split(' ')[0] === interaction.id;

        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 20000 });

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
                if (interaction.constructor.name === 'Message') { return sentMessage.edit({ embeds: [embed], components: [] }); }
                interaction.editReply({ embeds: [embed], components: [] });
            }
        });
    });
}
function createShopField(user, data, title, suffix) {
    const unlocked = user.level >= data.level;
    const purchaseable = unlocked && user.coins >= data.price;
    return {
        name: `${purchaseable ? ':white_check_mark:' : (unlocked ? ':credit_card:' : ':lock:')}  ${title}`,
        value: `${logic.text.capitalizeWords(data.name.replace(/_/g, ' '))} ${suffix} - ${data.price} coins ${purchaseable ? ` \`/buy ${suffix.toLowerCase()}\`` : ''}${!unlocked ? `(unlocked at lvl. ${data.level})` : ''}`
    };
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

/*
module.exports.sendShopRingsCommand = async function(interaction, user) {
    // SHOP: RING
    // Step 1 - Validate Can Buy
    const userRings = await db.rings.getAllUserRings(user.userid);
    if (user.level < 20) {
        return sendReply(interaction, 'You must be at least **Lvl. 20** to purchase rings!');
    } else if (userRings.length >= 10) {
        return sendReply(interaction, 'You already have **10 rings** in your inventory! Sell some with `/sell ring`.');
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
            name: `${interaction.user.tag} (Lvl. ${user.level})`,
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
    sendReply(interaction, { embeds: [embed], components: [row] }).then(async (sentMessage) => {
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
                if (interaction.constructor.name === 'Message') { return sentMessage.edit({ embeds: [embed], components: [] }); }
                interaction.editReply({ embeds: [embed], components: [] });
            }
        });
    });
}*/