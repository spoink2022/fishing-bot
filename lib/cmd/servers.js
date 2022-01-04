// Handle "redeem", "customfish" Commands
// # ---------------------------------- #

const db = require('../../db');
const logic = require('../logic');

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
        description: 'Thank you for supporting Big Tuna!\nModerators of this server may now use \`/customfish\`.'
    };
    interaction.reply({ embeds: [embed] });
}

module.exports.sendCustomFishCommand = async function(interaction, user) {

}