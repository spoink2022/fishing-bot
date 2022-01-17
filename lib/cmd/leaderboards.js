// Handle "leaderboards", "fishleaderboards", "rankings" Command
// # --------------------------------------------------------- #

const api = require('../../api');
const db = require('../../db');
const logic = require('../logic');

const { calculateFishWeight } = require('../misc/calculations.js');

const RANK_EMOJIS = [':first_place:', ':second_place:', ':third_place:', ':medal:', ':medal:', ':military_medal:', ':military_medal:', ':military_medal:', ':military_medal:', ':military_medal:'];;

module.exports.sendLeaderboardsCommand = async function(interaction, user, category) {
    // LEADERBOARDS
    // Step 1 - Validate Message Source
    if (interaction.channel.type !== 'GUILD_TEXT') {
        return interaction.reply('Leaderboards can only be accessed from servers!');
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

    let data, userData;
    if (category === 'kg') {
        data = (await db.users.fetchLeaderboardsByWeight(guildMemberIds));
        userData = await db.users.fetchLeaderboardsRankByWeight(interaction.user.id, guildMemberIds);
    } else if (category === 'score') {
        data = (await db.scores.fetchLeaderboardsByScore(guildMemberIds));
        userData = (await db.scores.fetchLeaderboardsRankByScore(interaction.user.id, guildMemberIds));
    } else {
        return interaction.reply('You must specify either **kg** or **score** when calling this command!'); // text-based command calls
    }
    const server = await db.servers.fetchServer(guild.id);
    
    // Step 3 - Send Embed
    const formattingFunction = category === 'kg' ? a => logic.text.kgToWeight(a/1000) : a => Math.round(a*10)/10;

    const selfString = `\n--------------------------------------------------\n${userData.rank <= 10 ? RANK_EMOJIS[userData.rank - 1] : `\`#${userData.rank}\``} ${tags[interaction.user.id]} - **${formattingFunction(userData.value)}**`;

    let embed = {
        color: logic.color.byServerPurchase(server),
        title: `Leaderboards by ${category === 'score' ? 'Fisher ' : ''}${logic.text.capitalizeWords(category)}`,
        author: {
            name: guild.name,
            icon_url: guild.iconURL()
        },
        description: data.map((obj, i) => {
            return `${i < 10 ? RANK_EMOJIS[i] : `\`#${i+1}\``} ${tags[obj.userid].replace(/\*/g, '\\*').replace(/_/g, '\\_').replace(/~/g, '\\~').replace(/`/g, '\\`')} - **${formattingFunction(obj.value)}**`
        }).join('\n') + selfString
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
    const globalLeaderboards = (await db.aquarium.fetchSpeciesForGlobalLeaderboards(fishName));
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
    const guildLeaderboards = (await db.aquarium.fetchSpeciesForLeaderboards(guildMemberIds, fishName));
    const guildRank = await db.aquarium.fetchSpeciesRanking(user.userid, guildMemberIds, fishName);
    
    // Step 4 - Construct Embed
    let embedFields = [{ name: 'Global' }, { name: 'This Server' }];
    embedFields[0].value = globalLeaderboards.map((obj, i) => {
        return `${RANK_EMOJIS[i]} ${tags[obj.userid] || '*Anonymous*'} - ${logic.text.kgToWeight(calculateFishWeight(obj.r, FishData))} (${logic.text.rToTier(obj.r)})`
    }).join('\n');
    embedFields[0].value += `\n--------------------------------------------------
${globalRank ? (globalRank.rank < 10 ? RANK_EMOJIS[globalRank.rank - 1] : `\`#${globalRank.rank}\``) : '\`N.A\`'}\
 ${interaction.user.tag} - ${globalRank ? `${logic.text.kgToWeight(calculateFishWeight(globalRank.r, FishData))} (${logic.text.rToTier(globalRank.r)})` : 'No Catch'}`;

    embedFields[1].value = guildLeaderboards.map((obj, i) => {
        return `${RANK_EMOJIS[i]} ${tags[obj.userid]} - ${logic.text.kgToWeight(calculateFishWeight(obj.r, FishData))} (${logic.text.rToTier(obj.r)})`
    }).join('\n');
    embedFields[1].value += `\n--------------------------------------------------
${guildRank ? (guildRank.rank < 10 ? RANK_EMOJIS[guildRank.rank - 1] : `\`#${guildRank.rank}\``) : '\`N.A\`'}\
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

module.exports.sendRankingsCommand = async function(interaction, user) {
    // RANKINGS
    const startTime = Date.now();
    // Step 1 - Validate Command
    if (user.supporter + user.big_supporter <= 0) { return interaction.reply('Due to the heavy processing power this command requires, usage is restricted to **Supporters** and **Big Supporters**.\nFor info, see \`/help supporter\`'); }

    // Step 1 - Fetch Data
    const LOCATIONS = Math.min(Math.floor(user.level / 10) + 1, 11);
    const rankings = await db.scores.fetchScoreRanks(user.userid, 11);
    const unlockedLocationData = api.fish.getAllUnlockedLocationData(user.level);

    // Step 2 - Send Embed
    const endTime = Date.now();
    let embed = {
        color: logic.color.byPurchase(user),
        title: 'Global Rankings',
        author: {
            name: `${interaction.user.tag} (Lvl. ${user.level})`,
            icon_url: interaction.user.displayAvatarURL()
        },
        description: `:small_blue_diamond: Below are real-time **global** rankings for each location, based on fisher score.
:small_blue_diamond: The fisher score for each location is provided as well.
:small_blue_diamond: For more specific details on a location, see the \`/scores\` command.\n\u200b`,
        fields: unlockedLocationData.map(LocationData => {
            const id = LocationData.id;
            return {
                name: `(${id}) ${LocationData.name}`,
                value: `${logic.text.numToRank(parseInt(rankings[`l${id}_rank`]))} - ${rankings[`l${id}`].toFixed(1)}`,
                inline: true
            }
        }),
        footer: {
            text: `This result was processed in ${endTime - startTime}ms`
        }
    };
    interaction.reply({ embeds: [embed] });
}