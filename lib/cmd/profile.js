const api = require('../../api');
const db = require('../../db');

const { createCanvasForEquipment } = require('../misc/canvas.js');
const { createEmbed } = require('../misc/embed.js');
const { kgToWeightString, parseBaitList, parseBaitObj } = require('../misc/str_functions.js');

async function attemptReply(msg, str) {
    if(msg.channel.type === 'dm') { msg.channel.send(str); }
    else { msg.reply(str); }
}

module.exports.c = {
    'stats': ['s', 'st'],
    'equipment': ['e'],
    'leaderboards': ['leaderboard', 'leaders', 'leader'],
    'baits': ['bait', 'b']
};

module.exports.run = async function(msg, cmd, args, user) {
    if(cmd === 'init') { sendInit(msg); }
    else if(cmd === 'stats') { sendStats(msg, user); }
    else if(cmd === 'equipment') { sendEquipment(msg, user); }
    else if(cmd === 'leaderboards') { sendLeaderboards(msg); }
    else if(cmd === 'baits') { sendBaits(msg, user); }
}

module.exports.sendInit = async function(msg) {
    db.users.initializeAccount(msg.author.id, function() {
        attemptReply(msg, `Congratulations, you've made an account!\nNext, simply type \`${PREFIX}info\``);
    });
}

async function sendStats(msg, user) {
    let playerLevelInfo = api.playerdata.getPlayerLevelInfo(user.level);
    const playerStats = await db.stats.fetchStats(msg.author.id);
    const unlockedLocations = api.fishing.getUnlockedLocations(user.level);

    let embedDescription = user.level >= 10 ? `:lollipop: ${user.lollipops} quest points\n` : '';
    embedDescription += `:coin: ${user.coins} coins\n:star2: Level ${user.level}\n:star: ${user.exp}/${playerLevelInfo.expRequired} Exp\n`
        + `:fishing_pole_and_fish: Fish Caught: ${playerStats.fish_caught}\n:scales: Weight Caught: ${kgToWeightString(playerStats.weight_caught/1000)}\n`
        + `:map: Current Location: ${user.location}\n:earth_americas: Unlocked Locations: ${unlockedLocations.join(', ')}`;
    let options = {
        author: [`${msg.author.tag} (Lvl. ${user.level})`, msg.author.displayAvatarURL()],
        title: `Stats for ${msg.author.username}`,
        color: api.visuals.getColor('rank', 0),
        description: embedDescription
    };
    let embed = await createEmbed(options);
    msg.channel.send(embed);
}

async function sendEquipment(msg, user) {
    let rodInfo = api.fishing.getRodData(user.rod);
    let lineInfo = api.fishing.getLineData(user.line);
    let hookInfo = api.fishing.getHookData(user.hook);
    
    let rodString = `__${rodInfo.name} Fishing Rod__\nMax Weight: **${kgToWeightString(rodInfo.maxWeight)}**\nCooldown Time: **${Math.round(rodInfo.cooldown/60000)}m**`;
    let lineString = `__${lineInfo.name} Line__\nMax Weight: **${kgToWeightString(lineInfo.maxWeight)}**\nBonus Exp: **+${lineInfo.bonus}**`;
    let hookString = `__${hookInfo.name} Hook__\nMax Weight: **${kgToWeightString(hookInfo.maxWeight)}**\nCoin Multiplier: **+${Math.round((hookInfo.multiplier-1)*100)}%**`;

    let canvasBuffer = await createCanvasForEquipment(user.rod, user.line, user.hook);
    // create & send embed
    let options = {
        author: [`${msg.author.tag} (Lvl. ${user.level})`, msg.author.displayAvatarURL()],
        title: `Fishing Equipment (Max ${kgToWeightString(Math.min(rodInfo.maxWeight, lineInfo.maxWeight, hookInfo.maxWeight))})`,
        color: api.visuals.getColor('rank', 0),
        fields: [
            { name: 'Fishing Rod :fishing_pole_and_fish:', value: rodString, inline: true },
            { name: 'Fishing Line :thread:', value: lineString, inline: true },
            { name: 'Hook :hook:', value: hookString, inline: true}
        ],
        attachment: { name: 'fishing_equipment.png', content: canvasBuffer }
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
        
        let embedDescription = []
        const namePrefixes = [':first_place:', ':second_place:', ':third_place:', ':medal:', ':medal:', ':military_medal:', ':military_medal:', ':military_medal:', ':military_medal:', ':military_medal:'];
        for(let i=0; i<Math.min(weights.length, 20); i++) {
            let weight = weights[i];
            let member = members.get(weight.userid);
            let namePrefix = i < 10 ? namePrefixes[i] : `\`#${i+1}\``;
            embedDescription += `${namePrefix} ${member.user.tag} - **${kgToWeightString(weight.weight_caught/1000)}**\n`;
        }
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

async function sendBaits(msg, user) {
    const userBaits = parseBaitList(user.bait);

    let embedDescription = '';
    for(const [key, val] of Object.entries(userBaits)) {
        if (val > 0) {
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