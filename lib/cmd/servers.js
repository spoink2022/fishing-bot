// Handle "redeem", "customfish" Commands
// # ---------------------------------- #
const { MessageActionRow, MessageButton } = require('discord.js');

const db = require('../../db');
const logic = require('../logic');

const { setCustomFish } = require('../global/custom_fish.js');

const { sendReply } = require('../misc/reply.js');

module.exports.sendAnnexCommand = async function(interaction, user) {
    // ANNEX
    // Step 1 - Ensure Eligibility
    if (interaction.channel.type !== 'GUILD_TEXT') {
        return sendReply(interaction, 'This command can only be called from servers!');
    }
    if (!user.annex_perms && user.all_premium_server < 1) {
        return sendReply(interaction, 'You do not have this privilege!');
    }
    const guild = interaction.guild;
    let server = await db.servers.fetchServer(guild.id);
    if (server.premium_tier == 0) {
        return sendReply(interaction, 'This server is not a premium server so it does not have a server shop!');
    }
    // Step 2 - Add Server Shop
    if (user.annexed_servers.includes(guild.id)) {
        return sendReply(interaction, 'You have already annexed this premium server!');
    }
    await db.users.addAnnexedServer(user.userid, guild.id);
    // Step 3 - Return Message
    sendReply(interaction, `Success! This **Tier ${server.premium_tier} Premium Server** has been added to your collection!\nCheck it out with \`/servershops\``);
}

module.exports.sendServerShopsCommand = async function(interaction, user) {
    // SERVERSHOPS
    // Step 1 - Ensure Eligibility
    if (!user.annex_perms && user.all_premium_server < 1) {
        return sendReply(interaction, 'You do not have this privilege!');
    }
    // Step 2 - Refresh Servershops That Need Refreshing
    const servers = await db.servers.fetchServers(user.annexed_servers);
    const epochWeek = Math.floor((Date.now() - 4*86400000) / 604800000); // offset 4 days to align with bounty
    for (let i=0; i<servers.length; i++) {
        let server = servers[i];
        if (server.shop_week < epochWeek) { // generate a new servershop
            const newShopEntries = logic.generation.generateServerShop(server.premium_tier);
            servers[i] = await db.servers.setColumns(server.serverid, { shop_entries: newShopEntries, shop_week: epochWeek });
            server = servers[i];
        }
        if (server.premium_tier > server.shop_entries.length) { // fill in remaining components of servershop
            const additionalShopEntries = logic.generation.generateServerShop(server.premium_tier - server.shop_entries.length);
            servers[i] = await db.servers.setColumns(server.serverid, { shop_entries: server.shop_entries.concat(additionalShopEntries) });
        }
    }
    if (user.shop_week < epochWeek) { // renew users claimability
        await db.users.setColumn(user.userid, 'shop_week', epochWeek);
        await db.users.resetServerShopClaims(user.userid);
    }
    // Step 3 - Cock and Balls
    let unclaimed = 0;
    let counts = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    let rawClaims = await db.users.getAllServerShopClaims(user.userid);
    let claims = {};
    // data structure for server claims
    for (let claim of rawClaims) {
        if (!(claim.serverid in claims)) {
            claims[claim.serverid] = [];
        }
        claims[claim.serverid].push(claim.deal);
    }
    // go through each server to tally up totals and count how many can be claimed from
    for (let server of servers) {
        counts[server.premium_tier-1] += 1;
        for (let i=0; i<server.premium_tier; i++) {
            let entry = server.shop_entries[i].split(' ');
            if (entry[2] == 0 && (!(server.serverid in claims) || !claims[server.serverid].includes(i+1))) {
                unclaimed += parseInt(entry[1]);
            }
        }
    }
    // Step 4 - Construct Embed
    let claimButton = new MessageButton().setCustomId(interaction.id).setLabel(`Claim Free Baits (${unclaimed})`).setStyle(unclaimed == 0 ? 'SECONDARY' : 'SUCCESS').setDisabled(unclaimed == 0);
    let row = new MessageActionRow().addComponents(claimButton);

    let embed = {
        color: logic.color.byPurchase(user),
        title: 'Annexed Servershops',
        author: {
            name: `${interaction.user.tag} (Lvl. ${user.level})`,
            icon_url: interaction.user.displayAvatarURL()
        },
        description: `${counts.map((elem, i) => elem === 0 ? '' : `**Tier ${i+1}** \u200b (x${elem})\n`).join('')}`,
        footer: {
            text: `New deals in ${logic.text.millisToString((epochWeek + 1) * 604800000 - Date.now() + 4*86400000)}`
        }
    };

    sendReply(interaction, { embeds: [embed], components: [row] }).then(async (sentMessage) => {
        const filter = i => i.customId.split(' ')[0] === interaction.id;

        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 10000 });

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) {
                return i.reply({ content: 'That button is not for you!', ephemeral: true });
            }
            let newEmbed = await handleServerShopClaimButton(user.userid);
            await i.update({ embeds: [embed, newEmbed], components: [] });
        });

        collector.on('end', (collected, reason) => {
            if (reason === 'time') {
                if (interaction.constructor.name === 'Message') { return sentMessage.edit({ components: [] }); }
                interaction.editReply({ components: [] });
            }
        });
    });
}
async function handleServerShopClaimButton(userid) {
    let user = await db.users.fetchUser(userid);
    // Step 1 - Refresh Servershops That Need Refreshing
    const servers = await db.servers.fetchServers(user.annexed_servers);
    const epochWeek = Math.floor((Date.now() - 4*86400000) / 604800000); // offset 4 days to align with bounty
    for (let i=0; i<servers.length; i++) {
        let server = servers[i];
        if (server.shop_week < epochWeek) { // generate a new servershop
            const newShopEntries = logic.generation.generateServerShop(server.premium_tier);
            servers[i] = await db.servers.setColumns(server.serverid, { shop_entries: newShopEntries, shop_week: epochWeek });
            server = servers[i];
        }
        if (server.premium_tier > server.shop_entries.length) { // fill in remaining components of servershop
            const additionalShopEntries = logic.generation.generateServerShop(server.premium_tier - server.shop_entries.length);
            servers[i] = await db.servers.setColumns(server.serverid, { shop_entries: server.shop_entries.concat(additionalShopEntries) });
        }
    }
    // Step 2 - Generate Data Structure for Claims
    let rawClaims = await db.users.getAllServerShopClaims(user.userid);
    let claims = {};
    for (let claim of rawClaims) {
        if (!(claim.serverid in claims)) {
            claims[claim.serverid] = [];
        }
        claims[claim.serverid].push(claim.deal);
    }
    // Step 3 - Iterate Through Deals
    let addedBait = {};
    for (let server of servers) {
        for (let i=0; i<server.premium_tier; i++) {
            let entry = server.shop_entries[i].split(' ');
            if (entry[2] == 0 && (!(server.serverid in claims) || !claims[server.serverid].includes(i+1))) {
                if (!(entry[0] in addedBait)) {
                    addedBait[entry[0]] = 0;
                }
                addedBait[entry[0]] += parseInt(entry[1]);
                db.users.createServerShopClaim(userid, server.serverid, i+1);
            }
        }
    }
    // Step 4 - Update DB and Return Embed
    db.bait.updateColumns(userid, addedBait);

    return {
        color: logic.color.STATIC.success,
        title: 'Claimed All Free Servershop Bait!',
        description: '**Gained**\n' + Object.keys(addedBait).map(key => `- ${key.replace(/_/g, ' ')} x${addedBait[key]}`).join('\n')
    };
}

module.exports.sendRedeemCommand = async function(interaction, user) {
    // REDEEM
    // Step 1 - Validate Command Source
    if (interaction.channel.type !== 'GUILD_TEXT') { return sendReply(interaction, 'The **redeem** command can only be used in servers!'); }
    if (user.custom_fish <= 0) { return sendReply(interaction, 'You have not purchased this perk! Please visit https://bigtuna.xyz/shop'); }

    const server = await db.servers.fetchServer(interaction.guild.id);
    if (server.premium_tier >= 9) { return sendReply(interaction, 'This server is already been boosted to the maximum tier!'); }
    // Step 2 - Update Database
    await db.users.updateColumns(user.userid, { custom_fish: -1 });
    await db.servers.updateColumns(server.serverid, {premium_tier: 1});
    // Step 3 - Send Embed
    let embed = {
        color: logic.color.STATIC.trophy,
        title: `Server Boosted to Tier ${server.premium_tier + 1}!`,
        author: {
            name: interaction.user.tag,
            icon_url: interaction.user.displayAvatarURL()
        },
        description: `Thank you for supporting Big Tuna!
${server.premium_tier === 0 ? 'Moderators of this server may now use \`/setcustomfish\`' : 'An additional slot has been made available in the Server Shop.'}`
    };
    sendReply(interaction, { embeds: [embed] });
}

module.exports.sendSetCustomFishCommand = async function(interaction, user, command) {
    // SETCUSTOMFISH
    // Step 1 - Validate Command Source
    if (interaction.channel.type !== 'GUILD_TEXT') { return sendReply(interaction, 'The **setcustomfish** command can only be used in servers!'); }
    const server = await db.servers.fetchServer(interaction.guild.id);
    if (server.premium_tier === 0) { return sendReply(interaction, 'This server is does not have this perk! Please visit https://bigtuna.xyz/shop to boost your server!'); }
    if (!interaction.member.permissions.has('MANAGE_GUILD')) { return sendReply(interaction, 'You must have **Manage Server** permissions in order to use this command!'); }
    
    if (!command) { return sendReply(interaction, 'You must provide the name of the new fish command!'); } // text-based command calls
    if (command.length >= 32) { return sendReply(interaction, `**${command}** exceeds 32 characters!`); }
    // Step 2 - Update Database/Global Variables
    await db.servers.setColumn(server.serverid, 'custom_fish', command.toLowerCase());
    await setCustomFish(server.serverid, command.toLowerCase());
    // Step 3 - Send Embed
    let embed = {
        color: logic.color.STATIC.trophy,
        title: 'Custom Fish Command Set!',
        description: `Typing **${command}** will now trigger \`/fish\`!`
    };
    sendReply(interaction, { embeds: [embed] });
}