// Handle "leaderboards" Command
// # ------------------------- #

const api = require('../../api');
const db = require('../../db');
const logic = require('../logic');

const RANK_EMOJIS = [':first_place:', ':second_place:', ':third_place:', ':medal:', ':medal:', ':military_medal:', ':military_medal:', ':military_medal:', ':military_medal:', ':military_medal:'];;

module.exports.sendLeaderboardsCommand = async function(interaction, user) {
    // LEADERBOARDS
    // Step 1 - Validate Message Source
    if (interaction.channel.type !== 'GUILD_TEXT') {
        interaction.reply('Leaderboards can only be accessed from servers!');
    }

    // Step 2 - Generate Leaderboard Data
    let tags = {};
    const guild = interaction.guild;
    const guildMemberIds = (await guild.members.fetch())
    .filter(guildMember => !guildMember.user.bot)
    .map(guildMember => {
        tags[guildMember.user.id] = `${guildMember.user.username}#${guildMember.user.discriminator}`;
        return guildMember.user.id;
    });

    const category = interaction.options.getSubcommand();
    let data;
    if (category === 'kg') {
        data = await db.users.fetchLeaderboardsByWeight(guildMemberIds);
    } else {
        data = await db.scores.fetchLeaderboardsByScore(guildMemberIds);
    }
    const server = await db.servers.fetchServer(guild.id);
    
    // Step 3 - Send Embed
    const formattingFunction = category === 'kg' ? a => logic.text.kgToWeight(a/1000) : a => Math.round(a*10)/10;

    const index = data.findIndex(x => x.userid === interaction.user.id);
    const selfString = `${index <= 10 ? RANK_EMOJIS[index] : `\`#${index+1}\``} ${tags[interaction.user.id]} - **${formattingFunction(data[index].value)}**\n--------------------------------------------------\n`;

    let embed = {
        color: logic.color.byServerPurchase(server),
        title: `Leaderboards by ${category === 'score' ? 'Fisher ' : ''}${logic.text.capitalizeWords(category)}`,
        author: {
            name: guild.name,
            icon_url: guild.iconURL()
        },
        description: selfString + data.map((obj, i) => {
            return `${i <= 10 ? RANK_EMOJIS[i] : `\`#${i+1}\``} ${tags[obj.userid]} - **${formattingFunction(obj.value)}**`
        }).join('\n')
    };
    interaction.reply({ embeds: [embed] });
}