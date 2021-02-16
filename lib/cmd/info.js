const api = require('../../api');
const db = require('../../db');

const { createItemShowcaseCanvas, createLineShowcaseCanvas, createFishShowcaseCanvas, createBackgroundShowcaseCanvas } = require('../misc/canvas.js');
const { createEmbed } = require('../misc/embed.js');
const gameLogic = require('../misc/game_logic.js');
const { capitalizeWords, kgToWeightString, percentToRarity, percentToRarityAbbr } = require('../misc/str_functions.js');

module.exports.c = {
    'iteminfo': ['ii'],
    'fishinfo': ['fi'],
    'locationinfo': ['li'],
    'info': ['help']
};

module.exports.run = async function(msg, cmd, args, user) {
    if(cmd === 'iteminfo') { sendItemInfo(msg, args); }
    else if(cmd === 'fishinfo') { sendFishInfo(msg, args); }
    else if(cmd === 'locationinfo') { sendLocationInfo(msg, args); }
    else if(cmd === 'info') { sendInfo(msg, args) }
}

async function sendItemInfo(msg, args) {
    let itemName = args.map(str => str.toLowerCase()).join(' ');
    let options = {
        title: `Info: ${capitalizeWords(itemName)}`
    };
    let canvasBuffer;
    if(['rod', 'rods', 'line', 'lines', 'hook', 'hooks'].includes(itemName)) {
        let namesList;
        if(itemName === 'rod' || itemName === 'rods') {
            namesList = api.fishing.getRodNames();
            options.title = 'Info: Rods';
            options.description = 'Rods affect cooldown and max weight';
        } else if(itemName === 'line' || itemName === 'lines') {
            namesList = api.fishing.getLineNames();
            options.title = 'Info: Lines';
            options.description = 'Lines affect max weight';
        } else {
            namesList = api.fishing.getHookNames();
            options.title = 'Info: Hooks';
            options.description = 'Hooks affect profit and max weight';
        }
        options.description += '\n\n**All Items (in order)**';
        for(const name of namesList) {
            options.description += `\n${capitalizeWords(name)}`;
        }
    } else if(itemName === 'aquarium' || itemName === 'aquariums') {
        let namesList = api.gamedata.getAquariumNames();
        options.title = 'Info: Aquariums';
        options.description = 'Aquarium level affects coin capacity and revenue\n\n**All Aquariums (in order)**';
        for(const name of namesList) {
            options.description += `\n${capitalizeWords(name)} Aquarium`;
        }
    } else if(itemName.endsWith('rod')) {
        let index = api.fishing.getRodNames().indexOf(itemName);
        if(index === -1) { msg.reply(`\`${itemName}\` is not a valid rod!`); return; }
        let rodInfo = api.fishing.getRodData(index);
        const cooldown = `${Math.floor(rodInfo.cooldown/3600000)}h ${Math.round(rodInfo.cooldown/60000)%60}m`;
        options.title += ` (Tier ${index})`;
        options.description = `:star2: Unlocks at lvl. ${rodInfo.level}\n:coin: Price: ${rodInfo.price ? `${rodInfo.price} coins` : 'None'}\n`
            + `:scales: Max Weight: ${kgToWeightString(rodInfo.maxWeight)}\n:alarm_clock: Cooldown: ${cooldown}`;
        canvasBuffer = await createItemShowcaseCanvas(IMAGES.rods[index], 0.5, 0.5);
    } else if(itemName.endsWith('line')) {
        let index = api.fishing.getLineNames().indexOf(itemName);
        if(index === -1) { msg.reply(`\`${itemName}\` is not a valid line!`); return; }
        let lineInfo = api.fishing.getLineData(index);
        options.title += ` (Tier ${index})`;
        options.description = `:star2: Unlocks at lvl. ${lineInfo.level}\n:coin: Price: ${lineInfo.price ? `${lineInfo.price} coins` : 'None'}\n`
            + `:scales: Max Weight: ${kgToWeightString(lineInfo.maxWeight)}`;
        canvasBuffer = await createLineShowcaseCanvas(lineInfo.rgb, lineInfo.px);
    } else if(itemName.endsWith('hook')) {
        let index = api.fishing.getHookNames().indexOf(itemName);
        if(index === -1) { msg.reply(`\`${itemName}\` is not a valid hook!`); return; }
        let hookInfo = api.fishing.getHookData(index);
        options.title += ` (Tier ${index})`;
        options.description = `:star2: Unlocks at lvl. ${hookInfo.level}\n:coin: Price: ${hookInfo.price ? `${hookInfo.price} coins` : 'None'}\n`
            + `:scales: Max Weight: ${kgToWeightString(hookInfo.maxWeight)}\n:gem: Coin Multiplier: +${Math.round((hookInfo.multiplier-1)*100)}%`;
        canvasBuffer = await createItemShowcaseCanvas(IMAGES.hooks[index], 0.25, 0.5);
    } else if(itemName.endsWith('aquarium')) {
        let index = api.gamedata.getAquariumNames().indexOf(itemName.substring(0, itemName.length - 9));
        if(index === -1) { msg.reply(`\`${itemName}\` is not a valid aquarium!`); return; }
        let aquariumInfo = api.gamedata.getAquariumInfo(index);
        options.title += ` (Tier ${index})`;
        options.description = `:star2: Unlocks at lvl. ${aquariumInfo.level}\n:coin: Price: ${aquariumInfo.price ? `${aquariumInfo.price} coins` : 'None'}\n`
            + `:bank: Capacity: ${aquariumInfo.max} coins\n:gem: Coin Multiplier: +${Math.round((aquariumInfo.multiplier-1)*100)}%`;
        canvasBuffer = await createItemShowcaseCanvas(IMAGES.aquarium[aquariumInfo.name.replace(/ /g, '_')], 0.5, 0.5);
    } else {
        msg.reply(`\`${itemName || ' '}\` is not a valid item!`);
        return;
    }

    if(canvasBuffer) { options.attachment = { name: 'item.png', content: canvasBuffer }; }
    let embed = await createEmbed(options);
    msg.channel.send(embed);
}

async function sendFishInfo(msg, args) {
    const fishNames = api.fishing.getFishNames();
    let fishName = args.join(' ').toLowerCase();
    if(!fishNames.includes(fishName)) {
        msg.reply(`\`${fishName || ' '}\` is not a valid fish!`);
        return;
    }
    let index = fishNames.indexOf(fishName);
    const fishInfo = api.fishing.getFishData(index);
    const locationInfo = api.fishing.getLocationData(fishInfo.location);
    for(let entry of locationInfo.fish) { if(entry.id===index) { rarity = percentToRarity(entry.chance) }}

    let sizeMult = await db.aquarium.getLargestSize(msg.author.id, fishInfo.name);
    let personalBest = sizeMult ? Math.round((fishInfo.sizeMin + (fishInfo.sizeMax-fishInfo.sizeMin)*sizeMult) * 1000) / 1000 : null;

    let canvasBuffer = await createFishShowcaseCanvas(IMAGES.fish[fishInfo.id.toString()], fishInfo.screenLen, locationInfo.zoom);

    let options = {
        title: `Info: ${capitalizeWords(fishName)}`,
        color: api.visuals.getColor('locations', locationInfo.id),
        description: `:map: Location: ${locationInfo.name}\n:dizzy: Rarity: ${rarity}\n:moneybag: Value: ${fishInfo.value} coins/kg\n`
            + `:scales: Weight: ${kgToWeightString(fishInfo.sizeMin)} - ${kgToWeightString(fishInfo.sizeMax)}+\n`
            + `:trophy: Personal Best: ${personalBest ? `${kgToWeightString(personalBest)} (${gameLogic.getTier(sizeMult).toUpperCase()})` : 'None'}`,
        attachment: { name: 'fish.png', content: canvasBuffer }
    };
    let embed = await createEmbed(options);
    msg.channel.send(embed);
}

async function sendLocationInfo(msg, args) {
    const locationInfo = api.fishing.getLocationData(parseInt(args[0]));
    if(!locationInfo) {
        msg.reply(`\`${args.join(' ') || ' '}\` is not a valid location ID!`);
        return;
    }
    let fishArr = [];
    for(let fishChance of locationInfo.fish) {
        const fishInfo = api.fishing.getFishData(fishChance.id);
        fishArr.push({
            name: capitalizeWords(fishInfo.name),
            rarity: percentToRarityAbbr(fishChance.chance),
            sizeMin: kgToWeightString(fishInfo.sizeMin),
            sizeMax: kgToWeightString(fishInfo.sizeMax)
        });
    }
    let embedFields = [];
    for(let fish of fishArr) {
        embedFields.push({
            name: `${fish.name} (${fish.rarity})`,
            value: `${fish.sizeMin} - ${fish.sizeMax}`,
            inline: false
        });
    }

    let canvasBuffer = await createBackgroundShowcaseCanvas(IMAGES.bg[locationInfo.id.toString()]);

    let options = {
        title: `Location ${locationInfo.id} - ${locationInfo.name}`,
        color: api.visuals.getColor('locations', locationInfo.id),
        description: `:star2: Unlocks at lvl. ${locationInfo.level}`,
        fields: embedFields,
        attachment: { name: 'background.png', content: canvasBuffer }
    }
    let embed = await createEmbed(options);
    msg.channel.send(embed);
}

async function sendInfo(msg, args) {
    let subject = args[0];
    const titles = api.text.getTitles('info');
    if(subject === 'start') {
        subject = 'Start';
    } else if(!titles.includes(subject)) {
        subject = 'General';
    }

    let options = {
        title: `Info - ${subject}`,
        description: api.text.getText('info', subject).map(str => str.replace('${PREFIX}', PREFIX)).join('\n'),
        footer: subject === 'General' ? `Detailed command information can be found using ${PREFIX}info <command>` : ''
    };
    let embed = await createEmbed(options);
    msg.channel.send(embed);
}