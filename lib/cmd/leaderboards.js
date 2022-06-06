// Handle "leaderboards", "fishleaderboards", "rankings" Command
// # --------------------------------------------------------- #

const api = require('../../api');
const db = require('../../db');
const logic = require('../logic');

const { calculateFishWeight } = require('../misc/calculations.js');
const { sendReply } = require('../misc/reply.js');

const RANK_EMOJIS = [':first_place:', ':second_place:', ':third_place:', ':medal:', ':medal:', ':military_medal:', ':military_medal:', ':military_medal:', ':military_medal:', ':military_medal:'];;

module.exports.sendLeaderboardsCommand = async function(interaction, user, category) {
    // LEADERBOARDS
    // Step 1 - Validate Message Source
    if (interaction.channel.type !== 'GUILD_TEXT') {
        return sendReply(interaction, 'Leaderboards can only be accessed from servers!');
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
        return sendReply(interaction, 'You must specify either **kg** or **score** when calling this command!'); // text-based command calls
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
    sendReply(interaction, { embeds: [embed] });
}

module.exports.sendFishLeaderboardsCommand = async function(interaction, user, option) {
    // FISHLEADERBOARDS
    // Step 1 - Validate Channel Source/Fish Name
    if (interaction.channel.type !== 'GUILD_TEXT') { return sendReply(interaction, 'Fish Leaderboards can only be accessed from servers!'); }
    if (!option) { return sendReply(interaction, 'You must specify the fish species to view leaderboards for!'); } // text-based command calls
    const fishName = option.toLowerCase().replace(/ /g, '_');
    const FishNames = api.fish.getFishNames();
    if (!FishNames.includes(fishName)) { return sendReply(interaction, `**${option}** is not a valid fish!`); }
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
        fields: embedFields
    }
    sendReply(interaction, { embeds: [embed] })
}

module.exports.sendRankingsCommand = async function(interaction, user, mentionedUser) {
    // RANKINGS
    const startTime = Date.now();
    // Step 1 - Validate Command
    if (user.supporter + user.big_supporter <= 0) { return sendReply(interaction, 'Due to the heavy processing power this command requires, usage is restricted to **Supporters** and **Big Supporters**.\nFor info, see \`/help supporter\`'); }

    if (mentionedUser && mentionedUser.id !== user.userid) {
        if (mentionedUser.bot) {
            return sendReply(interaction, `**${mentionedUser.username}** is a bot and cannot have a Big Tuna account!`);
        }
        user = await db.users.fetchUser(mentionedUser.id);
        
        if (!user) {
            return sendReply(interaction, `**${mentionedUser.username}** has not used Big Tuna before!`);
        } else if (!user.opted_in) {
            return sendReply(interaction, `**${mentionedUser.username}** is not opted in! They must use the \`/optin\` command to make their stats publicy visible.`);
        }
    }

    // Step 1 - Fetch Data
    const LOCATIONS = api.fish.getHighestLocation(user.level);
    const rankings = await db.scores.fetchScoreRanks(user.userid, LOCATIONS);
    const unlockedLocationData = api.fish.getAllUnlockedLocationData(user.level);

    // Step 2 - Send Embed
    const endTime = Date.now();
    let embed = {
        color: logic.color.byPurchase(user),
        title: 'Global Rankings by Fisher Score',
        author: {
            name: `${mentionedUser.tag} (Lvl. ${user.level})`,
            icon_url: mentionedUser.displayAvatarURL()
        },
        description: `:small_blue_diamond: Below are real-time **global** rankings for each location, based on fisher score.
:small_blue_diamond: The fisher score for each location is provided as well.
:small_blue_diamond: For more specific details on a location, see the \`/scores\` command.
\n${api.emoji.LOGO_TRANSPARENT} Total Score: **${rankings.overall.toFixed(1)}**
:globe_with_meridians: Global Rank: **${logic.text.numToRank(parseInt(rankings.overall_rank))}**\n\u200b`,
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
    if (embed.fields.length % 3 === 2) { embed.fields.push({ name: '\u200b', value: '\u200b', inline: true }); }
    sendReply(interaction, { embeds: [embed] });
}