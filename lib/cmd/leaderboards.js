// Handle "leaderboards" Command
// # ------------------------- #

const api = require('../../api');
const db = require('../../db');

module.exports.sendLeaderboardsCommand = async function(interaction, user) {
    // LEADERBOARDS
    // Step 1 - Validate Message Source
    if (interaction.channel.type !== 'GUILD_TEXT') {
        interaction.reply('Leaderboards can only be accessed from servers!');
    }

    // Step 2 - Generate Leaderboard Data
    const guild = interaction.guild;
    const guildMembers = (await guild.members.fetch())
    .filter(guildMember => !guildMember.user.bot)
    .map(guildMember => {
        return {
            userid: guildMember.user.id,
            tag: `${guildMember.user.username}#${guildMember.user.discriminator}`
        };
    });

    const category = interaction.options.getSubcommand();
    let data;
    if (category === 'kg') {
        data = await db.users.fetchLeaderboardsByWeight(guildMembers.map(obj => obj.userid));
    } else {
        data = await db.scores.fetchLeaderboardsByScore(guildMembers.map(obj => obj.userid));
    }
    console.log(data);

    // Step 3 - Send Embed
    interaction.reply('leaderboards');
}