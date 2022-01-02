// Handle "stats" "serverstats" Commands
// # --------------------------------- #

const api = require('../../api');
const db = require('../../db');
const logic = require('../logic');

module.exports.sendPlayerStatsCommand = async function(interaction, user) {
    // STATS
    // Step 1 - Validate Command Call
    let mentionedUser = interaction.options.getUser('user') || interaction.user;
    if (mentionedUser && mentionedUser.id !== interaction.user.id) {
        if (mentionedUser.bot) {
            return interaction.reply(`**${mentionedUser.username}** is a bot and cannot have a Big Tuna account!`);
        }
        user = await db.users.fetchUser(mentionedUser.id);
        if (!user) {
            return interaction.reply(`**${mentionedUser.username}** has not used Big Tuna before!`);
        } else if (!user.opted_in) {
            return interaction.reply(`**${mentionedUser.username}** is not opted in! They must use the \`/optin\` command to make their stats publicy visible.`);
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
            name: `${mentionedUser.username}#${mentionedUser.discriminator} (Lvl. ${user.level})`,
            icon_url: mentionedUser.displayAvatarURL()
        },
        description: `${user.opted_in ? ':white_check_mark: Opted In' : ':no_entry_sign: Opted Out (use `/optin` to make your stats public)'}
:lollipop: ${user.lollipops} Quest Point${user.lollipops !== 1 ? 's' : ''}
:coin: ${user.coins} Coin${user.coins !== 1 ? 's' : ''}
:star2: Level ${user.level}
:star: ${user.exp}/${expRequired} Exp
\n:fishing_pole_and_fish: Fish Caught: ${user.fish_caught}
:scales: Weight Caught: ${logic.text.kgToWeight(user.weight_caught/1000)}
${api.emoji.LOGO_TRANSPARENT} Fisher Score: ${Math.round(scores.overall*10)/10}
:map: Current Location: ${user.location}
:earth_americas: Unlocked Locations: ${user.level >= 50 ? `1-${Math.floor(user.level/10)+1}` : Array(Math.floor(user.level/10)+1).fill().map((_, index) => index+1).join(', ')}\
${user.big_supporter + user.custom_fish > 0 ? '\n' : ''}\
${user.big_supporter > 1 ? `\n:label: ${user.big_supporter - 1} Extra Premium Supporter${user.big_supporter !== 1 ? 's' : ''} (see \`giftpremium\`)` : ''}\
${user.custom_fish > 0 ? `\n:scroll: ${user.custom_fish} Custom Fish Server Gift${user.custom_fish !== 1 ? 's' : ''} (see \`redeem\`)` : ''}`
    };
    interaction.reply({ embeds: [embed] });
}

module.exports.sendServerStatsCommand = async function(interaction) {
    // SERVERSTATS
    // Step 1 - Validate Command Call
    if (interaction.channel.type !== 'GUILD_TEXT') {
        return interaction.reply('This command can only be used in servers!');
    }
    // Step 2 - Fetch Information
    const serverStats = await db.servers.fetchServerStats(interaction.guildId);
    // Step 3 - Send Embed
    let embed = {
        color: logic.color.byServerPurchase(serverStats),
        title: `Stats for ${interaction.guild.name}`,
        author: {
            name: interaction.guild.name,
            icon_url: interaction.guild.iconURL()
        },
        description: `:globe_with_meridians: Global Rank (kg): **${logic.text.numToRank(serverStats.rank)}**
:fishing_pole_and_fish: Total Fish Caught: **${serverStats.fish_caught}**
:scales: Total Weight Caught: **${logic.text.kgToWeight(serverStats.weight_caught/1000)}**\
${serverStats.custom_fish_privilege ? (serverStats.custom_fish ? `\n:scroll: Custom Fish Command: **${serverStats.custom_fish}**`: '\n:no_entry_sign: No Custom Fish Command (see `setcustomfish`)') : ''}`
    };
    interaction.reply({ embeds: [embed] });
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
            name: '@everyone',
            icon_url: client.user.displayAvatarURL()
        },
        description: `:fish: Fishers: ${users}
:shield: Clans: ${clans}
\n:fishing_pole_and_fish: Total Fish Caught: ${fish}
:scales: Total Weight Caught: ${logic.text.kgToWeight(grams/1000)}`
    };
    interaction.reply({ embeds: [embed] });
}