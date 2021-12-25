const api = require('../../api');
const db = require('../../db');

const adjustToEvent = require('../misc/adjust_to_event.js');
const { createCanvasForEquipment, createSkinShowcaseCanvas } = require('../misc/canvas.js');
const { millisToTimeString, millisToClockEmoji } = require('../misc/datetime.js');
const { createEmbed } = require('../misc/embed.js');
const { getStarCount, getClanPerks, getTier, calculateAvgRingChance, calculateAvgRingMultiplier } = require('../misc/game_logic.js');
const { kgToWeightString, numToRank, capitalizeWords, getCharFromNum } = require('../misc/str_functions.js');

async function attemptReply(msg, str) {
    if(msg.channel.type === 'dm') { msg.channel.send(str); }
    else { msg.reply(str); }
}

module.exports.c = {
    'init': ['start'],
    'stats': ['s', 'st'],
    'serverstats': ['ss'],
    'cooldowns': ['cd', 'cds', 'cooldown'],
    'equipment': ['e'],
    'leaderboards': ['leaderboard', 'leaders', 'leader', 'lb'],
    'fishleaderboards': ['fishlb', 'flb', 'fleaderboards'],
    'baits': ['bait', 'b'],
    'optin': [],
    'optout': [],
    'opt': [],
    'skin': ['skins'],
    'giveskin': ['gs']
};

module.exports.run = async function(msg, cmd, args, user) {
    if(cmd === 'stats') { sendStats(msg, user); }
    else if(cmd === 'serverstats') { sendServerstats(msg); }
    else if(cmd === 'cooldowns') { sendCooldowns(msg, user); }
    else if(cmd === 'equipment') { sendEquipment(msg, user); }
    else if(cmd === 'leaderboards') { sendLeaderboards(msg); }
    else if(cmd === 'fishleaderboards') { sendFishLeaderboards(msg, args); }
    else if(cmd === 'baits') { sendBaits(msg, user); }
    else if(cmd === 'optin' || (cmd === 'opt' && args[0] === 'in')) { sendOptIn(msg, user); }
    else if(cmd === 'optout' || (cmd === 'opt' && args[0] === 'out')) { sendOptOut(msg, user); }
    else if (cmd === 'skin') { sendSkin(msg, args, user); }
    else if (cmd === 'giveskin') { sendGiveSkin(msg, args, user); }
}

module.exports.sendInit = async function(msg) {
    db.users.initializeAccount(msg.author.id, function() {
        msg.channel.send(`**Welcome ${msg.author.toString()}, you are now a fisher!**\n\nPlease type \`.help 1\` for information on how to get started!`);
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
    + `:map: Current Location: ${user.location}\n:earth_americas: Unlocked Locations: ${unlockedLocations[0]}-${unlockedLocations[unlockedLocations.length-1]}\n`;
    if (pInfo) {
        if (pInfo.custom_fish > 0) {
            embedDescription += `\n:scroll: ${pInfo.custom_fish} Custom Fish Grant${pInfo.custom_fish===1 ? '' : 's'} (\`.redeem\` in a server to use)`;
        }
        if (pInfo.one_week_host > 1) {
            embedDescription += `\n:label: ${pInfo.one_week_host-1} Premium Supporter Gift${pInfo.one_week_host===2 ? '' : 's'} (\`.giftpremium [@user]\` to use)`;
        }
    }
    
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
    if (serverStats.custom_fish) {
        embedDescription += `\n:scroll: Custom Fish Command: **${serverStats.custom_fish}**`;
    } else if (serverStats.custom_fish_privilege) {
        embedDescription += `\n:no_entry_sign: No Custom Fish Command`;
    }

    let options = {
        title: `Stats for ${guild.name}`,
        author: guild.iconURL() ? ['\u200b', guild.iconURL()] : null,
        color: api.visuals.getNestedColor('cmd', 'serverstats', serverStats.custom_fish_privilege ? 'boosted' : 'default'),
        description: embedDescription
    };
    let embed = await createEmbed(options);
    msg.channel.send(embed);
}

async function sendCooldowns(msg, user) {
    // inital data requests
    const currentEvent = await db.events.getCurrentEvent();
    const clanMember = await db.clan.fetchMember(msg.author.id);
    const clan = clanMember ? await db.clan.fetchClan(clanMember.clan) : null;
    const rodInfo = api.fishing.getRodData(user.rod);
    const pInfo = await db.users.getPurchases(msg.author.id);
    let perks = getClanPerks(clan);
    // calculations
    let rodCooldown = rodInfo.cooldown;
    rodCooldown = adjustToEvent('rodCooldown', rodCooldown, currentEvent);
    rodCooldown *= (100 - perks.fish_cd)/100; // CLAN PERKS

    let timeToFish = user.cooldown - Date.now() + rodCooldown;
    let timeToVote = user.next_vote - Date.now();
    // cooldown accumulation
    if (pInfo && pInfo.one_week_host) {
        let capacity = Math.ceil(rodCooldown/60000);
        let minutesAccumulated = Math.min(Math.max(Math.floor(-timeToFish/60000), 0), capacity);
        // verifies precision for information display (acts true even with decimal cds)
        if (-timeToFish >= rodCooldown) {
            minutesAccumulated = capacity;
        }
        let emoji = timeToFish > 0 ? ':pause_button:' : (minutesAccumulated === capacity ? ':white_check_mark:' : ':arrows_clockwise:');
        var cdAccumulationString = `\n**Accumulated Time**: (${minutesAccumulated}/${capacity} minutes) ${emoji}`;
    }

    // embedDescription
    let embedDescription = `**Fish**: ${timeToFish <= 0 ? 'Ready!' : millisToTimeString(timeToFish)} ${millisToClockEmoji(timeToFish)}\
${pInfo && pInfo.one_week_host ? cdAccumulationString : ''}\
\n**Vote**: ${timeToVote <= 0 ? 'Ready!' : millisToTimeString(timeToVote)} ${millisToClockEmoji(timeToVote)}`;

    // color picking + embed construction
    let definingPurchase = pInfo && pInfo.one_day_host + pInfo.one_week_host > 0 ? (pInfo.one_week_host >= 1 ? 'oneWeekHost' : 'oneDayHost') : false;

    let options = {
        author: [`${msg.author.tag} (Lvl. ${user.level})`, msg.author.displayAvatarURL()],
        title: `Cooldowns`,
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
    let ring = user.equipped_ring ? await db.misc.rings.getRingData(user.equipped_ring) : null;
    let ringInfo = ring ? api.fishing.getRingData(ring.ring_type) : null;
    let swivelInfo = api.fishing.getSwivelData(user.swivel);

    let clanMember = await db.clan.fetchMember(user.userid);
    let clan = clanMember ? await db.clan.fetchClan(clanMember.clan) : null;
    let perks = getClanPerks(clan);
    let maxWeight = Math.min(rodInfo.maxWeight, lineInfo.maxWeight, hookInfo.maxWeight);
    let avgRingChance = ring ? calculateAvgRingChance(ring, ringInfo) : null;
    let avgRingMultiplier = ring ? calculateAvgRingMultiplier(ring, ringInfo) : null;

    let rodString = `__${rodInfo.name}__\nMax Weight: **${kgToWeightString(rodInfo.maxWeight)}**\nCooldown Time: **${Math.round(rodInfo.cooldown/60000)}m**`;
    let lineString = `__${lineInfo.name} Line__\nMax Weight: **${kgToWeightString(lineInfo.maxWeight)}**\nBonus Exp: **+${lineInfo.bonus}**`;
    let hookString = `__${hookInfo.name} Hook__\nMax Weight: **${kgToWeightString(hookInfo.maxWeight)}**\nCoin Multiplier: **+${Math.round((hookInfo.multiplier-1)*100)}%**`;
    let gloveString = user.glove === 0 ? null : `__${gloveInfo.name} Glove__\nChance: **${gloveInfo.chance}%**\nBonus: **+${gloveInfo.bonus}kg**`;
    let ringString = !ring ? null : `__${capitalizeWords(ring.ring_type)} Ring__\nAvg Chance: **${avgRingChance}%**\nAvg Multiplier: **x${avgRingMultiplier}**`;
    let swivelString = user.swivel === 0 ? null : `__${swivelInfo.name} Swivel__\nShark Bonus: **+${swivelInfo.bonus}kg**`;

    let bannerID = await db.cosmetics.getEquippedCosmetic(user.userid, 'equipment_banner');

    let canvasBuffer = await createCanvasForEquipment(user.rod, user.line, user.hook, user.glove, ring ? ring.ring_type : null, ring ? ringInfo.rating >= 5 : null, user.swivel, bannerID);
    // create & send embed
    let author = mentionedUser || msg.author;
    let options = {
        author: [`${author.tag} (Lvl. ${user.level})`, author.displayAvatarURL()],
        title: `Fishing Equipment (Max ${kgToWeightString(maxWeight)}${perks.max_weight ? ` + ${kgToWeightString(maxWeight * perks.max_weight/100)}` : ''})`,
        color: api.visuals.getNestedColor('cmd', 'stats', definingPurchase || 'default'),
        fields: [
            { name: 'Fishing Rod :fishing_pole_and_fish:', value: rodString, inline: true },
            { name: 'Fishing Line :thread:', value: lineString, inline: true },
            { name: 'Hook :hook:', value: hookString, inline: true}
        ],
        attachment: { name: 'fishing_equipment.png', content: canvasBuffer }
    };
    if (gloveString) { options.fields.push({ name: 'Gloves :gloves:', value: gloveString, inline: true }); }
    if (ringString) { options.fields.push({ name: 'Ring :ring:', value: ringString, inline: true }); }
    if (swivelString) { options.fields.push({ name: 'Swivel :safety_pin:', value: swivelString, inline: true }); }
    if (options.fields.length === 5) { options.fields.push({ name: '\u200b', value: '\u200b', inline: true }); }
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

// SKINS
const COSMETIC_CATEGORY_MAP = {
    'A': 'equipment_banner'
};
async function sendSkin(msg, args, user) {
    if (!args[0]) {
        sendAllSkins(msg, user);
        return;
    }
    args[0] = args[0].toUpperCase();

    let letter = args[0].slice(-1);
    let number = args[0].slice(0, -1);
    let category = COSMETIC_CATEGORY_MAP[letter];
    
    if (!category) {
        attemptReply(msg, `\`${args[0]}\` is not a valid skin ID! Check \`${msg.prefix}skins\` to view your skins.`);
        return;
    }
    let skin = await db.cosmetics.getCosmetic(msg.author.id, category, number-1);
    if (!skin) {
        attemptReply(msg, `\`${args[0]}\` is not a valid skin ID! Check \`${msg.prefix}skins\` to view your skins.`);
        return;
    }

    // SKIN IS REAL
    let categoryData = api.cosmetics.getCategoryData(category);
    let skinData = categoryData.contents[skin.cosmetic_id];
    let globalSupply = await db.cosmetics.getGlobalCosmeticCount(category, skin.cosmetic_id);

    let pInfo = await db.users.getPurchases(msg.author.id);
    let definingPurchase = pInfo && pInfo.one_day_host + pInfo.one_week_host > 0 ? (pInfo.one_week_host >= 1 ? 'oneWeekHost' : 'oneDayHost') : false;
    let embedColor = api.visuals.getNestedColor('cmd', 'stats', definingPurchase || 'default');

    let embedFields = [
        { name: 'Category', value: categoryData.name, inline: true },
        { name: 'Skin', value: skinData.name, inline: true },
        { name: 'Global Supply', value: globalSupply, inline: true }
    ];

    let canvasBuffer = await createSkinShowcaseCanvas(IMAGES.cosmetics[category][skin.cosmetic_id], 600, 450);

    let options = {
        author: [`${msg.author.tag} (Lvl. ${user.level})`, msg.author.displayAvatarURL()],
        title: `Skin - ${args[0]}`,
        color: embedColor,
        fields: embedFields,
        attachment: { name: `${skinData.src}.png`, content: canvasBuffer }
    };
    let embed = await createEmbed(options);
    msg.channel.send(embed).then(async (sentEmbed) => {
        sentEmbed.react(skin.equipped ? '⤵️' : '✅');
        sentEmbed.react('🗑️');
        const filter = ( reaction, user ) => (reaction.emoji.name === '🗑️' || reaction.emoji.name === (skin.equipped ? '⤵️' : '✅')) && user.id === msg.author.id;
        const collector = sentEmbed.createReactionCollector(filter, { time: 20000 });

        collector.on('collect', async(reactionData) => {
            collector.stop();
            if (reactionData.emoji.name === '⤵️') { //unequip skin
                await db.cosmetics.unequipCosmetic(skin.id);
                var options = {
                    title: `Successfully Unequipped Skin ${args[0]}`,
                    color: api.visuals.getColor('classic', 'success')
                };
            } else if (reactionData.emoji.name === '✅') { //equip skin
                await db.cosmetics.equipCosmetic(msg.author.id, skin.id, category);
                var options = {
                    title: `Successfully Equipped Skin ${args[0]}`,
                    color: api.visuals.getColor('classic', 'success')
                };
            } else if (reactionData.emoji.name === '🗑️') { //delete skin
                var options = {
                    title: `Delete Skin ${args[0]}?`,
                    color: embedColor,
                    description: 'You will no longer have this skin if you delete it.'
                }
            }

            let embed = await createEmbed(options);
            msg.channel.send(embed).then(async(sentEmbed) => {
                // DOUBLE CONFIRMATION FOR DELETING SKINS
                if (reactionData.emoji.name === '🗑️') {
                    sentEmbed.react('✅');
                    sentEmbed.react('❌');
                    const filter = ( reaction, user ) => (reaction.emoji.name === '✅' || reaction.emoji.name === '❌') && user.id === msg.author.id;
                    const collector = sentEmbed.createReactionCollector(filter, { time: 20000 });
                    collector.on('collect', async(reactionData) => {
                        collector.stop();
                        if (reactionData.emoji.name === '✅') {
                            db.cosmetics.deleteCosmetic(skin.id);
                            let options = {
                                title: `Successfully Deleted Skin: ${skinData.name}`,
                                color: api.visuals.getColor('classic', 'success')
                            };
                            let embed = await createEmbed(options);
                            msg.channel.send(embed);
                        }
                    });
                    collector.on('end', async(collected, reason) => {
                        sentEmbed.delete().catch(() => {
                            console.log('Couldn\'t delete SKIN embed');
                        });
                    });
                }
            });
            // DOUBLE CONFIRMATION SECTION END
        });
        collector.on('end', async() => {
            sentEmbed.reactions.removeAll().catch(() => {
                console.log('Couldn\'t remove SKIN reactions');
            });
        });
    });
}

async function sendAllSkins(msg, user) {
    let skins = await db.cosmetics.getAllCosmetics(msg.author.id);
    let Data = api.cosmetics.getAllCosmeticData();

    let pInfo = await db.users.getPurchases(msg.author.id);
    let definingPurchase = pInfo && pInfo.one_day_host + pInfo.one_week_host > 0 ? (pInfo.one_week_host >= 1 ? 'oneWeekHost' : 'oneDayHost') : false;

    // parsing skins variable
    let embedFieldsObj = {
        'equipment_banner': '\u200b'
    };
    let counts = {
        'equipment_banner': 0
    }
    for (let skin of skins) {
        let skinData = Data[skin.category].contents[skin.cosmetic_id];
        counts[skin.category]++;
        embedFieldsObj[skin.category] += `\`${counts[skin.category]}${getCharFromNum(Data[skin.category].index)}\` - ${skinData.name} ${skin.equipped ? ':white_check_mark:' : ''}\n`;
    }
    let embedFields = [];
    if (counts.equipment_banner > 0) { embedFields.push({ name: `Equipment Banners (${counts.equipment_banner}/10)`, value: embedFieldsObj.equipment_banner }) };
    
    let options = {
        author: [`${msg.author.tag} (Lvl. ${user.level})`, msg.author.displayAvatarURL()],
        title: `Skins Collection`,
        color: api.visuals.getNestedColor('cmd', 'stats', definingPurchase || 'default'),
        fields: embedFields,
        footer: embedFields.length > 0 ? `For information about a specific skin, use ${msg.prefix}skin [ID]` : 'You have no skins'
    };
    let embed = await createEmbed(options);
    msg.channel.send(embed);
}

async function sendGiveSkin(msg, args, user) {
    // check for valid skin
    if (!args[0]) {
        attemptReply(msg, 'You must specify the ID of the skin you want to give!');
        return;
    }
    args[0] = args[0].toUpperCase();

    let letter = args[0].slice(-1);
    let number = args[0].slice(0, -1);
    let category = COSMETIC_CATEGORY_MAP[letter];
    
    if (!category) {
        attemptReply(msg, `\`${args[0]}\` is not a valid skin ID! Check \`${msg.prefix}skins\` to view your skins.`);
        return;
    }
    let skin = await db.cosmetics.getCosmetic(msg.author.id, category, number-1);
    if (!skin) {
        attemptReply(msg, `\`${args[0]}\` is not a valid skin ID! Check \`${msg.prefix}skins\` to view your skins.`);
        return;
    }

    let categoryData = api.cosmetics.getCategoryData(category);
    let skinData = categoryData.contents[skin.cosmetic_id];
    // check for valid user
    let mentionedUser = msg.mentions.users.first();
    if (!mentionedUser) {
        attemptReply(msg, 'You must mention the user you are giving your skin to!');
        return;
    } else if (mentionedUser.id === user.userid) {
        attemptReply(msg, 'You can\'t give a skin to yourself!');
        return;
    }
    let mentionedUserAcc = await db.users.fetchUser(mentionedUser.id);
    if (!mentionedUserAcc) {
        attemptReply(msg, 'That user does not exist!');
        return;
    } else if (await db.cosmetics.getUserCosmeticCategoryCount(mentionedUser.id, category) >= 10) {
        attemptReply(msg, `That user already has 10 skins in the **${categoryData.name}** category!`);
        return;
    }

    // give skin
    await db.cosmetics.setOwner(skin.id, mentionedUser.id);
    let canvasBuffer = await createSkinShowcaseCanvas(IMAGES.cosmetics[category][skin.cosmetic_id], 120, 90);

    let options = {
        author: [`${msg.author.tag} (Lvl. ${user.level})`, msg.author.displayAvatarURL()],
        title: `Success!`,
        color: api.visuals.getColor('classic', 'success'),
        description: `You gave a **${skinData.name}** skin to <@${mentionedUser.id}>`,
        attachment: { name: `${skinData.src}.png`, content: canvasBuffer }
    };
    let embed = await createEmbed(options);
    msg.channel.send(embed);
}