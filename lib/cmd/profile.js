const api = require('../../api');
const db = require('../../db');

const { createCanvasForEquipment } = require('../misc/canvas.js');
const { createEmbed } = require('../misc/embed.js');
const { kgToWeightString } = require('../misc/str_functions.js');

module.exports.c = {
    'stats': ['s', 'st'],
    'equipment': ['e']
};

module.exports.run = async function(msg, cmd, args, user) {
    if(cmd === 'init') { sendInit(msg); }
    else if(cmd === 'stats') { sendStats(msg, user); }
    else if(cmd === 'equipment') { sendEquipment(msg, user); }
}

module.exports.sendInit = async function(msg) {
    db.users.initializeAccount(msg.author.id, function() {
        msg.reply('Yay');
    });
}

async function sendStats(msg, user) {
    let playerLevelInfo = api.playerdata.getPlayerLevelInfo(user.level);
    const playerStats = await db.stats.fetchStats(msg.author.id);
    const unlockedLocations = api.fishing.getUnlockedLocations(user.level);
    console.log(unlockedLocations);
    let embedDescription = `:coin: ${user.coins} coins\n:star2: Level ${user.level}\n:star: ${user.exp}/${playerLevelInfo.expRequired} Exp\n`
        + `:fishing_pole_and_fish: Fish Caught: ${playerStats.fish_caught}\n:scales: Weight Caught: ${kgToWeightString(playerStats.weight_caught/1000)}\n`
        + `:map: Current Location: ${user.location}\n:earth_americas: Unlocked Locations: ${unlockedLocations.join(', ')}`;
    let options = {
        author: [`${msg.author.tag} (Lvl. ${user.level})`, msg.author.displayAvatarURL()],
        title: `Stats for ${msg.author.username}`,
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
    let lineString = `__${lineInfo.name} Line__\nMax Weight: **${kgToWeightString(lineInfo.maxWeight)}**`;
    let hookString = `__${hookInfo.name} Hook__\nMax Weight: **${kgToWeightString(hookInfo.maxWeight)}**\nCoin Multiplier: **+${Math.round((hookInfo.multiplier-1)*100)}%**`;

    let canvasBuffer = await createCanvasForEquipment(user.rod, user.line, user.hook);
    // create & send embed
    let options = {
        author: [`${msg.author.tag} (Lvl. ${user.level})`, msg.author.displayAvatarURL()],
        title: `Fishing Equipment (Max ${kgToWeightString(Math.min(rodInfo.maxWeight, lineInfo.maxWeight, hookInfo.maxWeight))})`,
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