// Handle "redeem", "customfish" Commands
// # ---------------------------------- #

const db = require('../../db');
const logic = require('../logic');

const { setCustomFish } = require('../global/custom_fish.js');

module.exports.sendRedeemCommand = async function(interaction, user) {
    // REDEEM
    // Step 1 - Validate Command Source
    if (interaction.channel.type !== 'GUILD_TEXT') { return interaction.reply('The **redeem** command can only be used in servers!'); }
    if (user.custom_fish <= 0) { return interaction.reply('You have not purchased this perk! Please visit https://bigtuna.xyz/shop'); }
    const server = await db.servers.fetchServer(interaction.guild.id);
    if (server.custom_fish_privilege) { return interaction.reply('This server already has a Permanent Server Boost!'); }
    // Step 2 - Update Database
    await db.users.updateColumns(user.userid, { custom_fish: -1 });
    await db.servers.setColumn(server.serverid, 'custom_fish_privilege', true);
    // Step 3 - Send Embed
    let embed = {
        color: logic.color.STATIC.trophy,
        title: 'Server Boosted!',
        author: {
            name: interaction.user.tag,
            icon_url: interaction.user.displayAvatarURL()
        },
        description: 'Thank you for supporting Big Tuna!\nModerators of this server may now use \`/setcustomfish\`.'
    };
    interaction.reply({ embeds: [embed] });
}

module.exports.sendSetCustomFishCommand = async function(interaction, user, command) {
    // SETCUSTOMFISH
    // Step 1 - Validate Command Source
    if (interaction.channel.type !== 'GUILD_TEXT') { return interaction.reply('The **setcustomfish** command can only be used in servers!'); }
    const server = await db.servers.fetchServer(interaction.guild.id);
    if (!server.custom_fish_privilege) { return interaction.reply('This server is does not have this perk! Please visit https://bigtuna.xyz/shop to boost your server!'); }
    if (!interaction.member.permissions.has('MANAGE_GUILD')) { return interaction.reply('You must have **Manage Server** permissions in order to use this command!'); }
    
    if (!command) { return interaction.reply('You must provide the name of the new fish command!'); } // text-based command calls
    if (command.length >= 32) { return interaction.reply(`**${command}** exceeds 32 characters!`); }
    // Step 2 - Update Database/Global Variables
    await db.servers.setColumn(server.serverid, 'custom_fish', command.toLowerCase());
    await setCustomFish(server.serverid, command.toLowerCase());
    // Step 3 - Send Embed
    let embed = {
        color: logic.color.STATIC.trophy,
        title: 'Custom Fish Command Set!',
        description: `Typing **${command}** will now trigger \`/fish\`!`
    };
    interaction.reply({ embeds: [embed] });
}