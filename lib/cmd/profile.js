const api = require('../../api');
const db = require('../../db');

const { createCanvasForEquipment } = require('../misc/canvas.js');
const { createEmbed } = require('../misc/embed.js');
const { getStarCount, getTier } = require('../misc/game_logic.js');
const { kgToWeightString, numToRank, capitalizeWords } = require('../misc/str_functions.js');

async function attemptReply(msg, str) {
    if(msg.channel.type === 'dm') { msg.channel.send(str); }
    else { msg.reply(str); }
}

module.exports.c = {
    'init': ['start'],
    'stats': ['s', 'st'],
    'serverstats': ['ss'],
    'equipment': ['e'],
    'leaderboards': ['leaderboard', 'leaders', 'leader', 'lb'],
    'fishleaderboards': ['fishlb', 'flb', 'fleaderboards'],
    'baits': ['bait', 'b'],
    'optin': [],
    'optout': [],
    'opt': []
};

module.exports.run = async function(msg, cmd, args, user) {
    if(cmd === 'stats') { sendStats(msg, user); }
    else if(cmd === 'serverstats') { sendServerstats(msg); }
    else if(cmd === 'equipment') { sendEquipment(msg, user); }
    else if(cmd === 'leaderboards') { sendLeaderboards(msg); }
    else if(cmd === 'fishleaderboards') { sendFishLeaderboards(msg, args); }
    else if(cmd === 'baits') { sendBaits(msg, user); }
    else if(cmd === 'optin' || (cmd === 'opt' && args[0] === 'in')) { sendOptIn(msg, user); }
    else if(cmd === 'optout' || (cmd === 'opt' && args[0] === 'out')) { sendOptOut(msg, user); }
}

module.exports.sendInit = async function(msg) {
    db.users.initializeAccount(msg.author.id, function() {
        attemptReply(msg, `Congratulations, you've made an account!\nTo get fishing, type \`${PREFIX}help\``);
    });
}

async function sendStats(msg, user) {
    let mentionedUser = await msg.mentions.users.first();
    if (mentionedUser && msg.author.id !== mentionedUser.id) {
        if (mentionedUser.bot) {
            attemptReply(msg, 'bots can\'t be fishers!');
            return;
        }
        user = await db.users.fetchUser(mentionedUser.id);
        if (!user) {
            attemptReply(msg, `${mentionedUser.username} does'nt have an account yet! Go get them to type \`.start\``);
            return;
        } else if (!user.opted_in) {
            attemptReply(msg, `${mentionedUser.username} is not opted in! Get them to type \`.optin\``);
            return;
        }
    }

    let playerLevelInfo = api.leveldata.getPlayerLevelInfo(user.level);
    const playerStats = await db.stats.fetchStats(user.userid);
    const unlockedLocations = api.fishing.getUnlockedLocations(user.level);

    const pInfo = await db.users.getPurchases(user.userid); // "pInfo"
    let definingPurchase = pInfo && pInfo.one_day_host + pInfo.one_week_host > 0 ? (pInfo.one_week_host >= 1 ? 'oneWeekHost' : 'oneDayHost') : false;

    let embedDescription = user.opted_in ? ':white_check_mark: Opted In' : ':no_entry_sign: Opted Out (type `.optin` to make your stats public)';
    embedDescription += `\n${user.level >= 10 ? `:lollipop: ${user.lollipops} quest points\n` : ''}:coin: ${user.coins} coins\n:star2: Level ${user.level}\n`
    + `:star: ${user.exp}/${playerLevelInfo.expRequired} Exp\n`
    + `:fishing_pole_and_fish: Fish Caught: ${playerStats.fish_caught}\n:scales: Weight Caught: ${kgToWeightString(playerStats.weight_caught/1000)}\n`
    + `:map: Current Location: ${user.location}\n:earth_americas: Unlocked Locations: ${unlockedLocations.join(', ')}`;
    
    let author = mentionedUser || msg.author;

    let options = {
        author: [`${author.tag} (Lvl. ${user.level})`, author.displayAvatarURL()],
        title: `Stats for ${author.username}`,
        color: api.visuals.getNestedColor('cmd', 'stats', definingPurchase || 'default'),
        description: embedDescription
    };
    let embed = await createEmbed(options);
    msg.channel.send(embed);
}

async function sendEquipment(msg, user) {
    let mentionedUser = await msg.mentions.users.first();
    if (mentionedUser && msg.author.id !== mentionedUser.id) {
        if (mentionedUser.bot) {
            attemptReply(msg, 'bots can\'t be fishers!');
            return;
        }
        user = await db.users.fetchUser(mentionedUser.id);
        if (!user) {
            attemptReply(msg, `${mentionedUser.username} does'nt have an account yet! Go get them to type \`.start\``);
            return;
        } else if (!user.opted_in) {
            attemptReply(msg, `${mentionedUser.username} is not opted in! Get them to type \`.optin\``);
            return;
        }
    }
    const pInfo = await db.users.getPurchases(user.userid); // "pInfo"
    let definingPurchase = pInfo && pInfo.one_day_host + pInfo.one_week_host > 0 ? (pInfo.one_week_host >= 1 ? 'oneWeekHost' : 'oneDayHost') : false;

    let rodInfo = api.fishing.getRodData(user.rod);
    let lineInfo = api.fishing.getLineData(user.line);
    let hookInfo = api.fishing.getHookData(user.hook);
    let gloveInfo = api.fishing.getGloveData(user.glove);
    let swivelInfo = api.fishing.getSwivelData(user.swivel);

    let clanMember = await db.clan.fetchMember(user.userid);
    let clan = clanMember ? await db.clan.fetchClan(clanMember.clan) : null;
    let clanBonus = clan && getStarCount(clan.fish_caught) >= 6 ? 1.1 : 1;
    let maxWeight = Math.min(rodInfo.maxWeight, lineInfo.maxWeight, hookInfo.maxWeight) * clanBonus;
    
    let rodString = `__${rodInfo.name} Fishing Rod__\nMax Weight: **${kgToWeightString(rodInfo.maxWeight)}**\nCooldown Time: **${Math.round(rodInfo.cooldown/60000)}m**`;
    let lineString = `__${lineInfo.name} Line__\nMax Weight: **${kgToWeightString(lineInfo.maxWeight)}**\nBonus Exp: **+${lineInfo.bonus}**`;
    let hookString = `__${hookInfo.name} Hook__\nMax Weight: **${kgToWeightString(hookInfo.maxWeight)}**\nCoin Multiplier: **+${Math.round((hookInfo.multiplier-1)*100)}%**`;
    let gloveString = user.glove === 0 ? null : `__${gloveInfo.name} Glove__\nChance: **${gloveInfo.chance}%**\nBonus: **+${gloveInfo.bonus}kg**`;
    let swivelString = user.swivel === 0 ? null : `__${swivelInfo.name} Swivel__\nShark Bonus: **+${swivelInfo.bonus}kg**`;

    let canvasBuffer = await createCanvasForEquipment(user.rod, user.line, user.hook, user.glove, user.swivel);
    // create & send embed
    let author = mentionedUser || msg.author;
    let options = {
        author: [`${author.tag} (Lvl. ${user.level})`, author.displayAvatarURL()],
        title: `Fishing Equipment (Max ${kgToWeightString(maxWeight)})`,
        color: api.visuals.getNestedColor('cmd', 'stats', definingPurchase || 'default'),
        fields: [
            { name: 'Fishing Rod :fishing_pole_and_fish:', value: rodString, inline: true },
            { name: 'Fishing Line :thread:', value: lineString, inline: true },
            { name: 'Hook :hook:', value: hookString, inline: true}
        ],
        attachment: { name: 'fishing_equipment.png', content: canvasBuffer }
    };
    if (gloveString) { options.fields.push({ name: 'Gloves :gloves:', value: gloveString, inline: true }); }
    if (swivelString) { options.fields.push({ name: 'Swivel :safety_pin:', value: swivelString, inline: true }); }
    if (gloveString && swivelString) { options.fields.push({ name: '\u200b', value: '\u200b', inline: true }); }
    let embed = await createEmbed(options);
    msg.channel.send(embed);
}

async function sendServerstats(msg) {
    if (msg.channel.type !== 'text') {
        msg.channel.send(`This command can only be used in servers!`);
        return;
    }
    let guild = msg.guild;
    if(!guild.available) {
        msg.reply(`A server outage is preventing us from accessing your server\'s information\nPlease try again later`);
        return;
    }
    const serverStats = await db.stats.fetchServerStats(guild.id);
    let embedDescription = `:globe_with_meridians: Global Rank: **${numToRank(serverStats.rank)}**`;
    embedDescription += `\n:fishing_pole_and_fish: Total Fish Caught: **${serverStats.fish_caught}**`;
    embedDescription += `\n:scales: Total Weight Caught: **${kgToWeightString(serverStats.weight_caught/1000)}**`;

    let options = {
        title: `Stats for ${guild.name}`,
        author: guild.iconURL() ? ['\u200b', guild.iconURL()] : null,
        color: api.visuals.getColor('cmd', 'serverstats'),
        description: embedDescription
    };
    let embed = await createEmbed(options);
    msg.channel.send(embed);
}

async function sendLeaderboards(msg) {
    if(msg.channel.type === 'dm') {
        msg.channel.send(`This command can only be used in servers!`);
        return;
    }
    let guild = msg.guild;
    if(!guild.available) {
        msg.reply(`A server outage is preventing us from accessing your server\'s information\nPlease try again later`);
        return;
    }
    guild.members.fetch().then(async members => {
        realMembers = [];
        for(let member of members) {
            if(!member[1].user.bot) {
                realMembers.push(member[0]);
            }
        }
        let weights = (await db.stats.fetchWeightCaughtForLeaderboards(realMembers)).map(obj => {
            return {userid: obj.userid, weight_caught: parseInt(obj.weight_caught)};
        });
        weights.sort((a, b) => a.weight_caught > b.weight_caught ? -1 : 1);

        let embedDescription = [];
        const namePrefixes = [':first_place:', ':second_place:', ':third_place:', ':medal:', ':medal:', ':military_medal:', ':military_medal:', ':military_medal:', ':military_medal:', ':military_medal:'];
        for(let i=0; i<Math.min(weights.length, 20); i++) {
            let weight = weights[i];
            let member = members.get(weight.userid);
            let namePrefix = i < 10 ? namePrefixes[i] : `\`#${i+1}\``;
            embedDescription += `${namePrefix} ${member.user.tag.replace('_', '\\_')} - **${kgToWeightString(weight.weight_caught/1000)}**\n`;
        }
        let index = weights.findIndex(x => x.userid === msg.author.id);
        embedDescription += `--------------------------------------------------\n${index < 10 ? namePrefixes[index] : `\`#${index+1}\``} ${msg.author.tag} - **${kgToWeightString(weights[index].weight_caught/1000)}**`;
        
        let options = {
            title: `Leaderboards for ${guild.name}`,
            author: guild.iconURL() ? ['\u200b', guild.iconURL()] : null,
            color: api.visuals.getColor('cmd', 'leaderboards'),
            description: embedDescription
        };
        let embed = await createEmbed(options);
        msg.channel.send(embed);
    });
}

async function sendFishLeaderboards(msg, args) {
    const fishNames = api.fishing.getFishNames();
    let fishName = args.join(' ').toLowerCase();
    if(!fishNames.includes(fishName)) {
        attemptReply(msg, `\`${fishName || ' '}\` is not a valid fish!`);
        return;
    }
    let index = fishNames.indexOf(fishName);
    const fishInfo = api.fishing.getFishData(index);
    
    if(msg.channel.type === 'dm') {
        msg.channel.send(`This command can only be used in servers!`);
        return;
    }
    let guild = msg.guild;
    if(!guild.available) {
        msg.reply(`A server outage is preventing us from accessing your server\'s information\nPlease try again later`);
        return;
    }
    guild.members.fetch().then(async members => {
        const namePrefixes = [':first_place:', ':second_place:', ':third_place:', ':medal:', ':medal:', ':military_medal:', ':military_medal:', ':military_medal:', ':military_medal:', ':military_medal:'];
        realMembers = [];
        for(let member of members) {
            if(!member[1].user.bot) {
                realMembers.push(member[0]);
            }
        }
        // GLOBAL RANKINGS
        let sizeMults = (await db.aquarium.fetchSpeciesForGlobalLeaderboards(fishInfo.name)).map(obj => {
            return {userid: obj.userid, sizeMult: parseFloat(obj[fishInfo.name.replace(/ /g, '_')])};
        });
        sizeMults.sort((a, b) => a.sizeMult > b.sizeMult ? -1 : 1);

        let embedDescription = '**Global**\n';
        for(let i=0; i<Math.min(sizeMults.length, 10); i++) {
            let obj = sizeMults[i];
            let namePrefix = namePrefixes[i];
            let fishWeight = Math.round((fishInfo.sizeMin + (fishInfo.sizeMax-fishInfo.sizeMin)*obj.sizeMult) * 1000);
            let member = members.get(obj.userid);
            if (member) {
                embedDescription += `${namePrefix} ${member.user.tag.replace('_', '\\_')} - ${kgToWeightString(fishWeight/1000)} (${getTier(obj.sizeMult).toUpperCase()})\n`;
            } else {
                embedDescription += `${namePrefix} *Anonymous* - ${kgToWeightString(fishWeight/1000)} (${getTier(obj.sizeMult).toUpperCase()})\n`;
            }
        }
        let index = await db.aquarium.fetchSpeciesUserRanking(msg.author.id, fishInfo.name);
        if (index) {
            index.rank -= 1;
            let fishWeight = Math.round((fishInfo.sizeMin + (fishInfo.sizeMax-fishInfo.sizeMin)*index[fishInfo.name.replace(/ /g, '_')]) * 1000);
            embedDescription += `--------------------------------------------------\n${index.rank < 10 ? namePrefixes[index.rank] : `\`#${index.rank+1}\``} ${msg.author.tag} - ${kgToWeightString(fishWeight/1000)} (${getTier(index[fishInfo.name.replace(/ /g, '_')]).toUpperCase()})\n\n`;
        } else {
            embedDescription += `--------------------------------------------------\n\`N.A\` ${msg.author.tag} - No Catch\n\n`;
        }
        // GUILD RANKINGS
        sizeMults = (await db.aquarium.fetchSpeciesForLeaderboards(realMembers, fishInfo.name)).map(obj => {
            return {userid: obj.userid, sizeMult: parseFloat(obj[fishInfo.name.replace(/ /g, '_')])};
        });
        sizeMults.sort((a, b) => a.sizeMult > b.sizeMult ? -1 : 1);

        embedDescription += '**This Server**\n';
        for(let i=0; i<Math.min(sizeMults.length, 10); i++) {
            let obj = sizeMults[i];
            let member = members.get(obj.userid);
            let namePrefix = namePrefixes[i];
            let fishWeight = Math.round((fishInfo.sizeMin + (fishInfo.sizeMax-fishInfo.sizeMin)*obj.sizeMult) * 1000);
            embedDescription += `${namePrefix} ${member.user.tag.replace('_', '\\_')} - ${kgToWeightString(fishWeight/1000)} (${getTier(obj.sizeMult).toUpperCase()})\n`;
        }
        index = sizeMults.findIndex(x => x.userid === msg.author.id);
        if (index !== -1) { // user has caught this fish before
            let fishWeight = Math.round((fishInfo.sizeMin + (fishInfo.sizeMax-fishInfo.sizeMin)*sizeMults[index].sizeMult) * 1000);
            embedDescription += `--------------------------------------------------\n${index < 10 ? namePrefixes[index] : `\`#${index+1}\``} ${msg.author.tag} - ${kgToWeightString(fishWeight/1000)} (${getTier(sizeMults[index].sizeMult).toUpperCase()})`;
        } else {
            embedDescription += `--------------------------------------------------\n\`N.A\` ${msg.author.tag} - No Catch\n\n`;
        }
        
        let options = {
            title: `Species Leaderboards: ${capitalizeWords(fishInfo.name)}`,
            author: ['\u200b', api.images.fetchFishImgUrl(fishInfo.name)],
            color: api.visuals.getColor('cmd', 'leaderboards'),
            description: embedDescription
        };
        let embed = await createEmbed(options);
        msg.channel.send(embed);
    });
}

async function sendBaits(msg, user) {
    const userBaits = await db.users.fetchInventory(msg.author.id);
    const baitNames = api.gamedata.getAllBaitNames();

    let embedDescription = '';
    for(const [key, val] of Object.entries(userBaits)) {
        if (baitNames.includes(key) && val > 0) {
            embedDescription += `- ${key} **x${val}** \n`;
        }
    }

    let options = {
        author: [`${msg.author.tag} (Lvl. ${user.level})`, msg.author.displayAvatarURL()],
        title: `Bait Inventory`,
        color: api.visuals.getColor('cmd', 'baits'),
        description: embedDescription ? embedDescription : 'You do not have any bait.'
    };
    let embed = await createEmbed(options);
    msg.channel.send(embed);
}

async function sendOptIn(msg, user) {
    if (user.opted_in) {
        attemptReply(msg, 'You are already opted in!');
        return;
    }
    await db.users.setColumn(msg.author.id, 'opted_in', true);

    let options = {
        author: [`${msg.author.tag} (Lvl. ${user.level})`, msg.author.displayAvatarURL()],
        title: `Success!`,
        color: api.visuals.getColor('classic', 'success'),
        description: `Players will now be able to view your stats and aquariums.\n\
        Ask someone to type: \`.stats\` <@${msg.author.id}>`
    };
    let embed = await createEmbed(options);
    msg.channel.send(embed);
}

async function sendOptOut(msg, user) {
    if (!user.opted_in) {
        attemptReply(msg, 'You are already opted out!');
        return;
    }
    await db.users.setColumn(msg.author.id, 'opted_in', false);

    let options = {
        author: [`${msg.author.tag} (Lvl. ${user.level})`, msg.author.displayAvatarURL()],
        title: `Success!`,
        color: api.visuals.getColor('classic', 'success'),
        description: 'Your stats are private again.'
    };
    let embed = await createEmbed(options);
    msg.channel.send(embed);
}