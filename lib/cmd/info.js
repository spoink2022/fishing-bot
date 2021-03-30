const api = require('../../api');
const db = require('../../db');

const { createItemShowcaseCanvas, createLineShowcaseCanvas, createFishShowcaseCanvas, createBaitShowcaseCanvas, createBackgroundShowcaseCanvas } = require('../misc/canvas.js');
const { millisToTimeString } = require('../misc/datetime.js');
const { createEmbed } = require('../misc/embed.js');
const gameLogic = require('../misc/game_logic.js');
const { capitalizeWords, kgToWeightString, percentToRarity, classToString } = require('../misc/str_functions.js');

const SIZE_CLASSES = ['small', 'medium', 'large', 'extra large'];

async function attemptReply(msg, str) {
    if(msg.channel.type === 'dm') { msg.channel.send(str); }
    else { msg.reply(str); }
}

module.exports.c = {
    'iteminfo': ['ii'],
    'fishinfo': ['fi'],
    'locationinfo': ['li'],
    'info': ['help'],
    'event': []
};

module.exports.run = async function(msg, cmd, args, user) {
    if(cmd === 'iteminfo') { sendItemInfo(msg, args, user); }
    else if(cmd === 'fishinfo') { sendFishInfo(msg, args, user); }
    else if(cmd === 'locationinfo') { sendLocationInfo(msg, args, user); }
    else if(cmd === 'info') { sendInfo(msg, args) }
    else if(cmd === 'event') { sendEvent(msg); }
}

async function sendItemInfo(msg, args, user) {
    let itemName = args.map(str => str.toLowerCase()).join(' ');
    let options = {
        title: `Info: ${capitalizeWords(itemName)}`,
        color: api.visuals.getColor('cmd', 'iteminfo')
    };
    let canvasBuffer;
    if(['rod', 'rods', 'line', 'lines', 'hook', 'hooks'].includes(itemName)) {
        let equipmentPiece;
        if(itemName === 'rod' || itemName === 'rods') {
            equipmentPiece = 'Rod';
            allItemInfo = api.fishing.getAllRodData();
            options.title = 'Info: Rods';
            options.description = 'Rods affect cooldown and max weight';
        } else if(itemName === 'line' || itemName === 'lines') {
            equipmentPiece = 'Line';
            allItemInfo = api.fishing.getAllLineData();
            options.title = 'Info: Lines';
            options.description = 'Lines affect exp from catches and max weight';
        } else if(itemName === 'hook' || itemName === 'hooks') {
            equipmentPiece = 'Hook';
            allItemInfo = api.fishing.getAllHookData();
            options.title = 'Info: Hooks';
            options.description = 'Hooks affect profit and max weight';
        }
        let isShopItem = false;
        options.description += '\n\n**All Viewable Items (in order)**';
        for(const item of allItemInfo) {
            if(item.level > user.level) {
                if(!isShopItem) { isShopItem = true; }
                else { break; }
            }
            options.description += `\n${capitalizeWords(item.name)} ${equipmentPiece}`;
        }
    } else if(itemName === 'aquarium' || itemName === 'aquariums') {
        let allAquariumInfo = api.gamedata.getAllAquariumData();
        options.title = 'Info: Aquariums';
        options.description = 'Aquarium level affects coin capacity and revenue\n\n**All Aquariums (in order)**';
        let isShopItem = false;
        for(const aquarium of allAquariumInfo) {
            if(aquarium.level > user.level) {
                if(!isShopItem) { isShopItem = true; }
                else { break; }
            }
            options.description += `\n${capitalizeWords(aquarium.name)} Aquarium`;
        }
    } else if(itemName === 'bait' || itemName === 'baits') {
        options.title = 'Info: Baits';
        options.description = 'Use baits while fishing for better results.\nWith baits, there\'s no chance of catching a boot!\n\n**All Baits:**\n- ';
        options.description += api.gamedata.getAllBaitNames().join('\n- ');
    } else if(itemName.endsWith('rod')) {
        let index = api.fishing.getRodNames().indexOf(itemName);
        if(index === -1) { attemptReply(msg, `\`${itemName}\` is not a valid rod!`); return; }
        else if(index > api.fishing.getHighestItemID('rods', user.level)) { attemptReply(msg, `You must be a higher level to view this item!`); return; }
        let rodInfo = api.fishing.getRodData(index);
        const cooldown = `${Math.floor(rodInfo.cooldown/3600000)}h ${Math.round(rodInfo.cooldown/60000)%60}m`;
        options.title += ` (Tier ${index})`;
        options.description = `:star2: Unlocks at lvl. ${rodInfo.level}\n:coin: Price: ${rodInfo.price ? `${rodInfo.price} coins` : 'None'}\n`
            + `:scales: Max Weight: ${kgToWeightString(rodInfo.maxWeight)}\n:alarm_clock: Cooldown: ${cooldown}`;
        canvasBuffer = await createItemShowcaseCanvas(IMAGES.rods[index], 0.5, 0.5);
    } else if(itemName.endsWith('line')) {
        let index = api.fishing.getLineNames().indexOf(itemName);
        if(index === -1) { attemptReply(msg, `\`${itemName}\` is not a valid line!`); return; }
        else if(index > api.fishing.getHighestItemID('lines', user.level)) { attemptReply(msg, `You must be a higher level to view this item!`); return; }
        let lineInfo = api.fishing.getLineData(index);
        options.title += ` (Tier ${index})`;
        options.description = `:star2: Unlocks at lvl. ${lineInfo.level}\n:coin: Price: ${lineInfo.price ? `${lineInfo.price} coins` : 'None'}\n`
            + `:scales: Max Weight: ${kgToWeightString(lineInfo.maxWeight)}\n:gift: Bonus Exp: +${lineInfo.bonus} per catch`;
        canvasBuffer = await createLineShowcaseCanvas(lineInfo.rgb, lineInfo.px);
    } else if (itemName.endsWith('hook')) {
        let index = api.fishing.getHookNames().indexOf(itemName);
        if (index === -1) { attemptReply(msg, `\`${itemName}\` is not a valid hook!`); return; }
        else if (index > api.fishing.getHighestItemID('hooks', user.level)) { attemptReply(msg, `You must be a higher level to view this item!`); return; }
        let hookInfo = api.fishing.getHookData(index);
        options.title += ` (Tier ${index})`;
        options.description = `:star2: Unlocks at lvl. ${hookInfo.level}\n:coin: Price: ${hookInfo.price ? `${hookInfo.price} coins` : 'None'}\n`
            + `:scales: Max Weight: ${kgToWeightString(hookInfo.maxWeight)}\n:gem: Coin Multiplier: +${Math.round((hookInfo.multiplier-1)*100)}%`;
        canvasBuffer = await createItemShowcaseCanvas(IMAGES.hooks[index], 0.25, 0.5);
    } else if (itemName.endsWith('aquarium')) {
        let index = api.gamedata.getAquariumNames().indexOf(itemName.substring(0, itemName.length - 9));
        if (index === -1) { attemptReply(msg, `\`${itemName}\` is not a valid aquarium!`); return; }
        else if (index > api.gamedata.getHighestAquariumID(user.level)) { attemptReply(msg, `You must be a higher level to view this item!`); return; }
        let aquariumInfo = api.gamedata.getAquariumInfo(index);
        options.title += ` (Tier ${index})`;
        options.description = `:star2: Unlocks at lvl. ${aquariumInfo.level}\n:coin: Price: ${aquariumInfo.price ? `${aquariumInfo.price} coins` : 'None'}\n`
            + `:bank: Capacity: ${aquariumInfo.max} coins\n:gem: Coin Multiplier: +${Math.round((aquariumInfo.multiplier-1)*100)}%`;
        canvasBuffer = await createItemShowcaseCanvas(IMAGES.aquarium[aquariumInfo.name.replace(/ /g, '_')], 0.5, 0.5);
    } else if (api.gamedata.getAllBaitNames().includes(itemName)) {
        const baitInfo = api.gamedata.getBaitData(itemName);
        options.title += ` (bait)`;
        options.description = `Rating: ${':star:'.repeat(baitInfo.stars)}\nRecommended Price: ${baitInfo.value} :lollipop:`;
        if (baitInfo.tier !== 'D') { options.description += `\n- Minimum fish tier: **${baitInfo.tier}**`; }
        if (baitInfo.catchSmaller) {
            if (baitInfo.sizeClass !== 4) { options.description += `\n - Catches exclusively **${SIZE_CLASSES.slice(0, baitInfo.sizeClass).join(', ')}** fish`; }
        } else {
            if (baitInfo.sizeClass !== 1) { options.description += `\n - Catches exclusively **${SIZE_CLASSES.slice([baitInfo.sizeClass-1]).join(', ')}** fish`; }
        }
        canvasBuffer = await createBaitShowcaseCanvas(IMAGES.bait.container, IMAGES.bait[itemName]);
    } else {
        attemptReply(msg, `\`${itemName || ' '}\` is not a valid item!`);
        return;
    }

    if(canvasBuffer) { options.attachment = { name: 'item.png', content: canvasBuffer }; }
    let embed = await createEmbed(options);
    msg.channel.send(embed);
}

async function sendFishInfo(msg, args, user) {
    const fishNames = api.fishing.getFishNames();
    let fishName = args.join(' ').toLowerCase();
    if(!fishNames.includes(fishName)) {
        attemptReply(msg, `\`${fishName || ' '}\` is not a valid fish!`);
        return;
    }
    let index = fishNames.indexOf(fishName);
    const fishInfo = api.fishing.getFishData(index);
    if(!api.fishing.getUnlockedLocations(user.level).includes(fishInfo.location)) {
        attemptReply(msg, `You may only view the information of fish from locations you have unlocked!`);
        return;
    }
    const locationInfo = api.fishing.getLocationData(fishInfo.location);
    for(let entry of locationInfo.fish) { if(entry.id===index) { rarity = percentToRarity(entry.chance) }}

    let sizeMult = await db.aquarium.getLargestSize(msg.author.id, fishInfo.name);
    let personalBest = sizeMult ? Math.round((fishInfo.sizeMin + (fishInfo.sizeMax-fishInfo.sizeMin)*sizeMult) * 1000) / 1000 : null;

    let canvasBuffer = await createFishShowcaseCanvas(IMAGES.fish[fishInfo.id.toString()], fishInfo.screenLen, locationInfo.zoom);

    let options = {
        title: `Info: ${capitalizeWords(fishName)}`,
        color: api.visuals.getColor('locations', locationInfo.id),
        description: `:map: Location: ${locationInfo.name} (${locationInfo.id})\n:dizzy: Rarity: ${rarity}\n:mag: Class: ${classToString(fishInfo.sizeClass)}\n`
            + `:moneybag: Value: ${fishInfo.value} coins/kg\n`
            + `:scales: Weight: ${kgToWeightString(fishInfo.sizeMin)} - ${kgToWeightString(fishInfo.sizeMax)}+\n`
            + `:trophy: Personal Best: ${personalBest ? `${kgToWeightString(personalBest)} (${gameLogic.getTier(sizeMult).toUpperCase()})` : 'None'}`,
        attachment: { name: 'fish.png', content: canvasBuffer }
    };
    let embed = await createEmbed(options);
    msg.channel.send(embed);
}

async function sendLocationInfo(msg, args, user) {
    // determine whether to send or not
    const locationInfo = api.fishing.getLocationData(parseInt(args[0]));
    if(!args[0] || args[0] === 'all') {
        sendAllLocationInfo(msg, user);
        return;
    } else if(!locationInfo) {
        attemptReply(msg, `\`${args.join(' ') || ' '}\` is not a valid location ID!`);
        return;
    }
    let unlockedLocations = api.fishing.getUnlockedLocations(user.level);
    if(locationInfo.id !== 1 && !unlockedLocations.includes(locationInfo.id-1)) {
        attemptReply(msg, `You may only view unlocked or soon-to-be-unlocked locations!`);
        return;
    }
    // determine whether to draw fish (dont draw for non-unlocked)
    let embedFields = [], embedDescriptionEnd = '';
    if(unlockedLocations.includes(locationInfo.id)) {
        let fishArr = [];
        for(let fishChance of locationInfo.fish) {
            const fishInfo = api.fishing.getFishData(fishChance.id);
            fishArr.push({
                name: capitalizeWords(fishInfo.name),
                rarity: percentToRarity(fishChance.chance),
                sizeMin: kgToWeightString(fishInfo.sizeMin),
                sizeMax: kgToWeightString(fishInfo.sizeMax)
            });
        }
        for(let fish of fishArr) {
            embedFields.push({
                name: `${fish.name} *(${fish.rarity})*`,
                value: `${fish.sizeMin} - ${fish.sizeMax}`,
                inline: false
            });
        }
    } else {
        embedDescriptionEnd = '\n:closed_lock_with_key: You may view fish once you have unlocked this location';
    }
    // create embed
    let canvasBuffer = await createBackgroundShowcaseCanvas(IMAGES.bg[locationInfo.id.toString()]);

    let options = {
        title: `Location ${locationInfo.id} - ${locationInfo.name}`,
        color: api.visuals.getColor('locations', locationInfo.id),
        description: `:star2: Unlocks at lvl. ${locationInfo.level}${embedDescriptionEnd}`,
        fields: embedFields || null,
        attachment: { name: 'background.png', content: canvasBuffer }
    }
    let embed = await createEmbed(options);
    msg.channel.send(embed);
}

async function sendAllLocationInfo(msg, user) {
    const unlockedLocations = api.fishing.getUnlockedLocations(user.level);
    let embedDescription = '';
    for(let locationID of unlockedLocations) {
        let locationInfo = api.fishing.getLocationData(locationID);
        embedDescription += `(${locationID}) ${locationInfo.name} - :unlock: (lvl. ${locationInfo.level})\n`;
    }
    if(unlockedLocations.length !== api.fishing.getLocationDatasetLength()) { // due the locked
        let locationID = unlockedLocations[unlockedLocations.length-1] + 1;
        let locationInfo = api.fishing.getLocationData(locationID);
        embedDescription += `(${locationID}) ${locationInfo.name} - :lock: (lvl. ${locationInfo.level})`;
    }
    let options = {
        color: api.visuals.getColor('cmd', 'locationinfo'),
        title: 'Viewable Locations',
        description: embedDescription,
        footer: 'For more information about a certain location, use the ".locationinfo <locationID>" command'
    };
    let embed = await createEmbed(options);
    msg.channel.send(embed);
}

async function sendInfo(msg, args) {
    let subject = args[0];
    const titles = api.text.getTitles('info');
    if(subject === 'start') {
        subject = 'Start';
    } else if(subject === 'mechanics') {
        subject = 'Mechanics';
    } else if(!titles.includes(subject)) {
        subject = 'General';
    }

    let options = {
        title: `Info - ${subject}`,
        color: api.visuals.getColor('cmd', 'info'),
        description: api.text.getText('info', subject).map(str => str.replace(/\${PREFIX}/g, PREFIX)).join('\n'),
        footer: subject === 'General' ? `Don't know what a command does? Just type ${PREFIX}info <command name>` : ''
    };
    let embed = await createEmbed(options);
    msg.channel.send(embed);
}
module.exports.sendInfo = sendInfo;

async function sendEvent(msg) {
    let eventEntry = await db.events.getUpcomingEvent();
    if(!eventEntry) {
        var options = {
            color: api.visuals.getColor('cmd', 'event'),
            title: 'No Upcoming Events',
            description: 'Check back later! :mailbox_with_no_mail:'
        };
    } else {
        if(eventEntry.start_time > Date.now()) {
            var embedDescription = {
                time: `Starts in ${millisToTimeString(eventEntry.start_time - Date.now())} :alarm_clock:`,
                duration: `Duration: ${millisToTimeString(eventEntry.end_time - eventEntry.start_time)} :stopwatch:`,
                description: eventEntry.description
            }
        } else {
            var embedDescription = {
                time: `LIVE - Event started ${millisToTimeString(Date.now() - eventEntry.start_time)} ago :hourglass:`,
                duration: `Ends in ${millisToTimeString(end_time - Date.now())} :stopwatch:`,
                description: eventEntry.description
            }
        }
        var options = {
            color: api.visuals.getColor('cmd', 'event'),
            title: `${capitalizeWords(eventEntry.type.split('_').join(' '))} Event`,
            description: Object.values(embedDescription)
        };
    }
    let embed = await createEmbed(options);
    msg.channel.send(embed);
}