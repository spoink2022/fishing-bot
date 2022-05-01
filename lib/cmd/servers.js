// Handle "redeem", "customfish" Commands
// # ---------------------------------- #

const db = require('../../db');
const logic = require('../logic');

const { setCustomFish } = require('../global/custom_fish.js');

const { sendReply } = require('../misc/reply.js');

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