// Handle "stats" "serverstats" Commands
// # --------------------------------- #

const api = require('../../api');
const db = require('../../db');
const logic = require('../logic');

const { getTutorialThreeEmbed } = require('./tutorial.js');

const { sendReply } = require('../misc/reply.js');

module.exports.sendPlayerStatsCommand = async function(interaction, user, mentionedUser) {
    // STATS
    // Step 1 - Validate Command Call
    if (mentionedUser && mentionedUser.id !== interaction.user.id) {
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

    // Step 2 - Fetch Information
    const expRequired = api.leveldata.getPlayerLevelData(user.level + 1).expRequired;
    const scores = await db.scores.fetchScores(user.userid);

    // Step 3 - Send Embed
    let embed = {
        color: logic.color.byPurchase(user),
        title: `Stats for ${mentionedUser.username}`,
        author: {
            name: `${mentionedUser.tag} (Lvl. ${user.level})`,
            icon_url: mentionedUser.displayAvatarURL()
        },
        description: `:lollipop: ${user.lollipops} Quest Point${user.lollipops !== 1 ? 's' : ''}
:coin: ${user.coins} Coin${user.coins !== 1 ? 's' : ''}
:star2: Level ${user.level}
:star: ${user.exp}/${expRequired} Exp
\n:fishing_pole_and_fish: Fish Caught: ${user.fish_caught}
:scales: Weight Caught: ${logic.text.kgToWeight(user.weight_caught/1000)}
${api.emoji.LOGO_TRANSPARENT} Fisher Score: ${Math.round(scores.overall*10)/10}
:map: Current Location: ${user.location}
:earth_americas: Unlocked Locations: ${user.level >= 50 ? `1-${Math.min(Math.floor(user.level/10)+1, 14)}` : Array(Math.floor(user.level/10)+1).fill().map((_, index) => index+1).join(', ')}\
${user.level >= 140 ? `\n:dna: Current Prestige: ${user.prestige} (x${10**(3 * user.prestige)})` : ''}\
${user.big_supporter + user.custom_fish > 0 ? '\n' : ''}\
${user.big_supporter > 1 ? `\n:label: ${user.big_supporter - 1} Extra Premium Supporter${user.big_supporter !== 2 ? 's' : ''} (see \`giftpremium\`)` : ''}\
${user.custom_fish > 0 ? `\n:scroll: ${user.custom_fish} Server Boost${user.custom_fish !== 1 ? 's' : ''} (see \`/redeem\`)` : ''}`
};

    let embedArr = [embed];

    if (user.tutorial === 2) {
        embedArr.push(await getTutorialThreeEmbed(interaction, user));
    }

    sendReply(interaction, { embeds: embedArr });
}

module.exports.sendServerStatsCommand = async function(interaction) {
    // SERVERSTATS
    // Step 1 - Validate Command Call
    if (interaction.channel.type !== 'GUILD_TEXT') {
        return sendReply(interaction, 'This command can only be used in servers!');
    }
    // Step 2 - Fetch Information
    const serverStats = await db.servers.fetchServerStats(interaction.guildId);
    // Step 3 - Send Embed
    let embed = {
        color: logic.color.byServerPurchase(serverStats),
        title: `Server Stats`,
        author: {
            name: interaction.guild.name,
            icon_url: interaction.guild.iconURL()
        },
        description: `${serverStats.premium_tier > 0 ? `:sparkles: Premium Tier ${serverStats.premium_tier} ${serverStats.premium_tier == 9 ? ' :sparkles:' : ''}\n\n` : ''}\
:mirror: Shard ID: **${interaction.guild.shardId}**
:globe_with_meridians: Global Rank (kg): **${logic.text.numToRank(serverStats.rank)}**
:fishing_pole_and_fish: Total Fish Caught: **${serverStats.fish_caught}**
:scales: Total Weight Caught: **${logic.text.kgToWeight(serverStats.weight_caught/1000)}**\
${serverStats.premium_tier > 0 || serverStats.custom_fish ? (serverStats.custom_fish ? `\n:scroll: Custom Fish Command: **${serverStats.custom_fish}**`: '\n:no_entry_sign: No Custom Fish Command (see `setcustomfish`)') : ''}`
    };
    sendReply(interaction, { embeds: [embed] });
}

module.exports.sendGlobalStatsCommand = async function(interaction) {
    // GLOBALSTATS
    // Step 1 - Fetch Information
    const { users, fish, grams } = await db.users.fetchGlobalUserStats();
    const { clans } = await db.clan.fetchClanCount();
    // Step 2 - Send Embed
    let embed = {
        color: logic.color.STATIC.tuna,
        title: `Global Stats`,
        author: {
            name: 'Global Stats',
            icon_url: client.user.displayAvatarURL()
        },
        description: `:fish: Fishers: ${users}
:shield: Clans: ${clans}
\n:fishing_pole_and_fish: Total Fish Caught: ${fish}
:scales: Total Weight Caught: ${logic.text.kgToWeight(grams/1000)}`
    };
    sendReply(interaction, { embeds: [embed] });
}

module.exports.sendContributionsCommand = async function(interaction, user) {
    // CONTRIBUTIONS
    // Step 1 - Fetch Information
    //const globalDollarsSpent = await db.users.fetchGlobalDollarsSpent();
    //const dollarsSpent = user.all_supporter * 1.5 + user.all_big_supporter * 10 + user.all_premium_server * 20;
    //const globalShare = dollarsSpent / globalDollarsSpent * 100;
    /* FOR EMBED: Total: $${dollarsSpent.toFixed(2)}
Global Share: ${globalShare.toFixed(2)}%*/
    // Step 2 - Send Embed
    let embed = {
        color: logic.color.byPurchase(user),
        title: `Contributions to Big Tuna`,
        author: {
            name: `${interaction.user.tag} (Lvl. ${user.level})`,
            icon_url: interaction.user.displayAvatarURL()
        },
        description: `**All Supporter Items**
${user.all_supporter + user.all_big_supporter + user.all_premium_server == 0 ? 'None\n' : ''}\
${user.all_supporter ? `:sushi: Supporter x${user.all_supporter}\n` : ''}\
${user.all_big_supporter ? `:trophy: Big Supporter x${user.all_big_supporter}\n` : ''}\
${user.all_premium_server ? `:sparkles: Premium Server x${user.all_premium_server}\n` : ''}`,
        footer: {
            text: 'Items received from gifts will not appear in this page'
        }
    };
    sendReply(interaction, { embeds: [embed] });
}