// Handle "leaderboards", "fishleaderboards" Command
// # --------------------------------------------- #

const api = require('../../api');
const db = require('../../db');
const logic = require('../logic');

const { calculateFishWeight } = require('../misc/calculations.js');

const RANK_EMOJIS = [':first_place:', ':second_place:', ':third_place:', ':medal:', ':medal:', ':military_medal:', ':military_medal:', ':military_medal:', ':military_medal:', ':military_medal:'];;

module.exports.sendLeaderboardsCommand = async function(interaction, user, category) {
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

    let data;
    if (category === 'kg') {
        data = (await db.users.fetchLeaderboardsByWeight(guildMemberIds)).slice(0, 20);
    } else if (category === 'score') {
        data = (await db.scores.fetchLeaderboardsByScore(guildMemberIds)).slice(0, 20);
    } else {
        return interaction.reply('You must specify either **kg** or **score** when calling this command!'); // text-based command calls
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
            return `${i <= 10 ? RANK_EMOJIS[i] : `\`#${i+1}\``} ${tags[obj.userid].replace(/\*/g, '\\*').replace(/_/g, '\\_').replace(/~/g, '\\~').replace(/`/g, '\\`')} - **${formattingFunction(obj.value)}**`
        }).join('\n')
    };
    interaction.reply({ embeds: [embed] });
}

module.exports.sendFishLeaderboardsCommand = async function(interaction, user, option) {
    // FISHLEADERBOARDS
    // Step 1 - Validate Channel Source/Fish Name
    if (interaction.channel.type !== 'GUILD_TEXT') { interaction.reply('Fish Leaderboards can only be accessed from servers!'); }
    if (!option) { return interaction.reply('You must specify the fish species to view leaderboards for!'); } // text-based command calls
    const fishName = option.toLowerCase().replace(/ /g, '_');
    const FishNames = api.fish.getFishNames();
    if (!FishNames.includes(fishName)) { return interaction.reply(`**${option}** is not a valid fish!`); }
    const FishData = api.fish.getFishDataByName(fishName);

    // Step 2 - Fetch Information (Global)
    const globalLeaderboards = (await db.aquarium.fetchSpeciesForGlobalLeaderboards(fishName)).slice(0, 20);;
    const globalRank = await db.aquarium.fetchGlobalSpeciesRanking(user.userid, fishName);

    // Step 3 - Fetch Information (Guild)
    let tags = {};
    const guild = interaction.guild;
    const guildMemberIds = (await guild.members.fetch())
    .filter(guildMember => !guildMember.user.bot)
    .map(guildMember => {
        tags[guildMember.user.id] = `${guildMember.user.tag.replace(/\*/g, '\\*').replace(/_/g, '\\_').replace(/~/g, '\\~').replace(/`/g, '\\`')}`;
        return guildMember.user.id;
    });
    const guildLeaderboards = (await db.aquarium.fetchSpeciesForLeaderboards(guildMemberIds, fishName)).slice(0, 20);
    const guildRank = await db.aquarium.fetchSpeciesRanking(user.userid, guildMemberIds, fishName);
    
    // Step 4 - Construct Embed
    let embedFields = [{ name: 'Global' }, { name: 'This Server' }];
    embedFields[0].value = globalLeaderboards.map((obj, i) => {
        return `${RANK_EMOJIS[i]} ${tags[obj.userid] || '*Anonymous*'} - ${logic.text.kgToWeight(calculateFishWeight(obj.r, FishData))} (${logic.text.rToTier(obj.r)})`
    }).join('\n');
    embedFields[0].value += `\n--------------------------------------------------
${globalRank ? (globalRank.rank <= 10 ? RANK_EMOJIS[globalRank.rank - 1] : `#${globalRank.rank}`) : '\`N.A\`'}\
 ${interaction.user.tag} - ${globalRank ? `${logic.text.kgToWeight(calculateFishWeight(globalRank.r, FishData))} (${logic.text.rToTier(globalRank.r)})` : 'No Catch'}`;

    embedFields[1].value = guildLeaderboards.map((obj, i) => {
        return `${RANK_EMOJIS[i]} ${tags[obj.userid]} - ${logic.text.kgToWeight(calculateFishWeight(obj.r, FishData))} (${logic.text.rToTier(obj.r)})`
    }).join('\n');
    embedFields[1].value += `\n--------------------------------------------------
${guildRank ? (guildRank.rank <= 10 ? RANK_EMOJIS[guildRank.rank - 1] : `#${guildRank.rank}`) : '\`N.A\`'}\
 ${interaction.user.tag} - ${guildRank ? `${logic.text.kgToWeight(calculateFishWeight(guildRank.r, FishData))} (${logic.text.rToTier(guildRank.r)})` : 'No Catch'}`

    const server = await db.servers.fetchServer(guild.id);
    let embed = {
        color: logic.color.byPurchase(server),
        title: `Fish Leaderboards: ${logic.text.capitalizeWords(fishName.replace(/_/g, ' '))}`,
        author: {
            name: logic.text.capitalizeWords(fishName.replace(/_/g, ' ')),
            icon_url: api.images.fetchFishImgUrl(fishName)
        },
        fields: embedFields
    }
    interaction.reply({ embeds: [embed] })
}