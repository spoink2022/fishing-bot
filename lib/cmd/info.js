const api = require('../../api');
const db = require('../../db');

const { createItemShowcaseCanvas, createLineShowcaseCanvas, createFishShowcaseCanvas, createBaitShowcaseCanvas, createBackgroundShowcaseCanvas, createCroppedItemShowcaseCanvas, createSkinHelpCanvas } = require('../misc/canvas.js');
const { millisToTimeString } = require('../misc/datetime.js');
const { createEmbed } = require('../misc/embed.js');
const gameLogic = require('../misc/game_logic.js');
const { capitalizeWords, kgToWeightString, percentToRarity, classToString } = require('../misc/str_functions.js');

const SIZE_CLASSES = ['small', 'medium', 'large', 'extra large'];
const GRADES = ['consumer', 'premium', 'sashimi', 'trophy'];
const WEATHER_ICONS = [':sunny:', ':partly_sunny:', ':cloud:', ':cloud_rain:', ':thunder_cloud_rain:'];

async function attemptReply(msg, str) {
    if(msg.channel.type === 'dm') { msg.channel.send(str); }
    else { msg.reply(str); }
}

module.exports.c = {
    'iteminfo': ['ii'],
    'fishinfo': ['fi'],
    'locationinfo': ['li'],
    'info': ['commands', 'command', 'cmd', 'cmds'],
    'help': ['guide'],
    'event': []
};

module.exports.run = async function(msg, cmd, args, user) {
    if(cmd === 'iteminfo') { sendItemInfo(msg, args, user); }
    else if(cmd === 'fishinfo') { sendFishInfo(msg, args, user); }
    else if(cmd === 'locationinfo') { sendLocationInfo(msg, args, user); }
    else if(cmd === 'info') { sendInfo(msg, args) }
    else if(cmd === 'help') { sendHelp(msg, args, user); }
    else if(cmd === 'event') { sendEvent(msg); }
}

async function sendItemInfo(msg, args, user) {
    let itemName = args.map(str => str.toLowerCase()).join(' ');
    let options = {
        title: `Info: ${capitalizeWords(itemName)}`,
        color: api.visuals.getColor('cmd', 'iteminfo'),
        fields: []
    };
    let canvasBuffer;
    if(['rod', 'rods', 'line', 'lines', 'hook', 'hooks', 'glove', 'gloves', 'swivel', 'swivels'].includes(itemName)) {
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
        } else if (itemName === 'glove' || itemName === 'gloves') {
            equipmentPiece = 'Glove';
            allItemInfo = api.fishing.getAllGloveData();
            options.title = 'Info: Gloves';
            options.description = 'Gloves give a chance of increased max weight when you fish';
        } else if (itemName === 'swivel' || itemName === 'swivels') {
            equipmentPiece = 'Swivel';
            allItemInfo = api.fishing.getAllSwivelData();
            options.title = 'Info: Swivels';
            options.description = 'Swivels increase rod strength on sharks';
        }
        let isShopItem = false;
        options.fields = [{ name: 'All Viewable Items (in order)', value: '\u200b', inline: true }, { name: '\u200b', value: '\u200b', inline: true }];
        let itemCount = 0;
        for(const item of allItemInfo) {
            itemCount++;
            if(item.level > user.level) {
                if(!isShopItem) { isShopItem = true; }
                else { break; }
            }
            options.fields[Math.floor(itemCount/30)].value += `\n${capitalizeWords(item.name)} ${equipmentPiece}`;
        }
        if (equipmentPiece === 'Glove' && user.level < 20) {
            options.description = '*Gloves are unlocked at level 20*';
            delete options.fields;
        } else if (equipmentPiece === 'Swivel' && user.level < 50) {
            options.description = '*Swivels are unlocked at level 50*';
            delete options.fields;
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
    } else if (itemName === 'ring' || itemName === 'rings') {
        options.title = 'Info: Rings';
        options.description = 'Rings are selectable and affect the quantity and quality of card drops';
        if (user.level < 20) {
            options.description += '\n\n**Rings are unlocked at level 20**';
        } else {
            let allRingInfo = Object.entries(api.fishing.getAllRingData()).map(tuple => {
                return { name: tuple[0], premium: tuple[1].rating >= 5 };
            });
            let regularFieldText = '', premiumFieldText = '';
            allRingInfo.forEach(obj => {
                if (obj.premium) { premiumFieldText += `\n${capitalizeWords(obj.name)}`; }
                else { regularFieldText += `\n${capitalizeWords(obj.name)}`; }
            });
            options.fields = [
                { name: 'Regular Rings', value: regularFieldText, inline: true },
                { name: 'Premium Rings', value: premiumFieldText, inline: true }
            ];
        }
    } else if(itemName === 'bait' || itemName === 'baits') {
        options.title = 'Info: Baits';
        options.description = 'Use baits while fishing for better results.\nWith baits, there\'s no chance of catching trash!\nBelow, baits are sorted by relative usefulness:\n\u200b';
        const STARS = 3;
        for (let i=1; i<=STARS; i++) {
            options.fields.push({name: ':star:'.repeat(i), value: api.gamedata.getAllBaitNames(i).join('\n'), inline: true});
        }
        options.footer = 'Type .iteminfo <bait name> to learn more about a specific bait'
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
    } else if (itemName.endsWith('glove') || itemName.endsWith('gloves')) {
        options.title = options.title.replace('Gloves', 'Glove');
        let gloveType = itemName.split(' ').slice(0, -1).join(' ');
        let gloveID = api.fishing.getAllGloveData().map(obj => obj.name.toLowerCase()).indexOf(gloveType) + 1;
        if (gloveID === 0) { attemptReply(msg, `\`${itemName}\` is not a valid glove!`); return; }
        else if (gloveID > api.fishing.getHighestItemID('gloves', user.level)) { attemptReply(msg, `You must be a higher level to view this item!`); return; }
        let gloveInfo = api.fishing.getGloveData(gloveID);
        options.title += ` (Tier ${gloveID})`;
        options.description = `:star2: Unlocks at lvl. ${gloveInfo.level}\n:coin: Price: ${gloveInfo.price} coins\n\
        :four_leaf_clover: Activation Chance: ${gloveInfo.chance}%\n:mechanical_arm: Activation Bonus: +${gloveInfo.bonus}kg`;
        canvasBuffer = await createItemShowcaseCanvas(IMAGES.gloves[gloveID], 1/4, 1/3);
    } else if (itemName.endsWith('swivel')) {
        let swivelType = itemName.split(' ').slice(0, -1).join(' ');
        let swivelID = api.fishing.getAllSwivelData().map(obj => obj.name.toLowerCase()).indexOf(swivelType) + 1;
        if (swivelID === 0) { attemptReply(msg, `\`${itemName}\` is not a valid swivel!`); return; }
        else if (swivelID > api.fishing.getHighestItemID('swivels', user.level)) { attemptReply(msg, `You must be a higher level to view this item!`); return; }
        let swivelInfo = api.fishing.getSwivelData(swivelID);
        options.title += ` (Tier ${swivelID})`;
        options.description = `:star2: Unlocks at lvl. ${swivelInfo.level}\n:coin: Price: ${swivelInfo.price} coins\n\:shark: Shark Bonus: +${swivelInfo.bonus}kg`;
        canvasBuffer = await createItemShowcaseCanvas(IMAGES.swivels[swivelID], 1/3, 2/3);
    } else if (itemName.endsWith('aquarium')) {
        let index = api.gamedata.getAquariumNames().indexOf(itemName.substring(0, itemName.length - 9));
        if (index === -1) { attemptReply(msg, `\`${itemName}\` is not a valid aquarium!`); return; }
        else if (index > api.gamedata.getHighestAquariumID(user.level)) { attemptReply(msg, `You must be a higher level to view this item!`); return; }
        let aquariumInfo = api.gamedata.getAquariumInfo(index);
        options.title += ` (Tier ${index})`;
        options.description = `:star2: Unlocks at lvl. ${aquariumInfo.level}\n:coin: Price: ${aquariumInfo.price ? `${aquariumInfo.price} coins` : 'None'}\n`
            + `:bank: Capacity: ${aquariumInfo.max} coins\n:gem: Coin Multiplier: +${Math.round((aquariumInfo.multiplier-1)*100)}%`;
        canvasBuffer = await createItemShowcaseCanvas(IMAGES.aquarium[aquariumInfo.name.replace(/ /g, '_')], 0.5, 0.5);
    } else if (itemName.endsWith('ring')) {
        if (user.level < 20) { attemptReply(msg, 'You must be at least **level 20** to view ring stats!'); return; }
        let ringName = itemName.split(' ').slice(0, -1).join(' ');
        let ringInfo = api.fishing.getRingData(ringName);
        if (!ringInfo) { attemptReply(msg, `\`${itemName}\` is not a valid ring!`); return; }
        options.description = `:ring: Ring Type: ${ringInfo.rating >= 5 ? 'Premium' : 'Regular'}\n:coin: Sell Rate: ${api.fishing.getRingSellRate(ringInfo.rating)}%\n\n**Ability**`;
        // class-based boosts
        for (let i=0; i<4; i++) {
            if (ringInfo.classBoost[i] > 0) {
                options.description += `\n+${ringInfo.classBoost[i]}% card drops from **${SIZE_CLASSES[i]}** fish`;
            }
        }
        // grade boosts
        for (let i=0; i<3; i++) {
            if (ringInfo.gradeBoost[i] > 0) {
                options.description += `\n${ringInfo.gradeBoost[i]}% of **${GRADES[i]}** converts to **${GRADES[i+1]}**`;
            }
        }
        if (ringInfo.rating === 0) { options.description += '\nNone' }
        let cropY = ringInfo.rating >= 5 ? 0 : 64;
        canvasBuffer = await createCroppedItemShowcaseCanvas(IMAGES.rings[ringName.replace(/ /g, '_')], 0, cropY, 256, 320-cropY, 0, 0, 256, 320-cropY);
    } else if (api.gamedata.getAllBaitNames().includes(itemName)) {
        const baitInfo = api.gamedata.getBaitData(itemName);
        options.title += ` (bait)`;
        options.description = `Rating: ${':star:'.repeat(baitInfo.stars)}\nRecommended Price: ${baitInfo.value} :lollipop:`;
        if (baitInfo.tier !== 'D') { options.description += `\n- Minimum fish tier: **${baitInfo.tier}**`; }
        if (baitInfo.sizes.length !== 4) { options.description += `\n - Catches exclusively **${baitInfo.sizes.map(num => SIZE_CLASSES[num-1]).join(', ')}** fish`; }
        if (baitInfo.families.length !== 0) { options.description += `\n - More likely to catch **${baitInfo.families.join(', ')}**`; }
        canvasBuffer = await createBaitShowcaseCanvas(IMAGES.bait.container, IMAGES.bait[itemName]);
    } else if (!itemName) {
        attemptReply(msg, 'You must specify what you need information on! (e.g `.iteminfo wooden hook`)');
        return;
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
        if (api.fishing.getFamilyNames().includes(fishName)) {
            sendFamilyInfo(msg, fishName, user.level);
        } else if (fishName === ''){
            sendAllFamilyInfo(msg);
        } else { 
            attemptReply(msg, `\`${fishName || ' '}\` is not a valid fish!`);
        }
        return;
    }
    let index = fishNames.indexOf(fishName);
    const fishInfo = api.fishing.getFishData(index);
    if(!api.fishing.getUnlockedLocations(user.level).includes(fishInfo.location)) {
        attemptReply(msg, `You may only view the information of fish from locations you have unlocked!`);
        return;
    }
    const locationInfo = api.fishing.getLocationData(fishInfo.location);
    for(let entry of locationInfo.fish) { if(entry.id===index) { rarity = percentToRarity(entry.chance); }}

    let sizeMult = await db.aquarium.getLargestSize(msg.author.id, fishInfo.name);
    let personalBest = sizeMult ? Math.round((fishInfo.sizeMin + (fishInfo.sizeMax-fishInfo.sizeMin)*sizeMult) * 1000) / 1000 : null;

    let canvasBuffer = await createFishShowcaseCanvas(IMAGES.fish[fishInfo.id.toString()], fishInfo.screenLen, locationInfo.zoom);

    let options = {
        title: `Info: ${capitalizeWords(fishName)}`,
        color: api.visuals.getColor('locations', locationInfo.id),
        description: `:map: Location: ${locationInfo.name} (${locationInfo.id})\n:dizzy: Rarity: ${rarity}\n:mag: Class: ${classToString(fishInfo.sizeClass)}\n`
            + `:notebook_with_decorative_cover: Family: ${fishInfo.family ? fishInfo.family : 'none'}\n:moneybag: Value: ${fishInfo.value} coins/kg\n`
            + `:scales: Weight: ${kgToWeightString(fishInfo.sizeMin)} - ${kgToWeightString(fishInfo.sizeMax)}+\n`
            + `:trophy: Personal Best: ${personalBest ? `${kgToWeightString(personalBest)} (${gameLogic.getTier(sizeMult).toUpperCase()})` : 'None'}`,
        attachment: { name: 'fish.png', content: canvasBuffer }
    };
    let embed = await createEmbed(options);
    msg.channel.send(embed);
}
async function sendFamilyInfo(msg, familyName, userLevel) {
    let familyInfo = api.fishing.getFamilyData(familyName);
    let firstLocation = familyInfo[0].location;

    let unlockedLocations = api.fishing.getUnlockedLocations(userLevel);
    familyInfo = familyInfo.filter(fishObj => {
        return unlockedLocations.includes(fishObj.location);
    });

    const baits = api.gamedata.getBaitsByFamily(familyName);
    let embedDescription = familyInfo.length === 0 ? `You have not yet unlocked any fish in the **${capitalizeWords(familyName)}** family.\n\nTry again when you unlock a new location!` : `Showing all unlocked fish in the **${capitalizeWords(familyName)}** family.`;
    if (familyInfo.length !== 0 && baits[0]) {
        embedDescription += `\nPreferred bait: **${baits.join(', ')}**`;
    }

    let embedFields = {};
    const LocationNames = api.fishing.getLocationNames();
    for (let fishObj of familyInfo) {
        let locationName = LocationNames[fishObj.location-1] + ` (${fishObj.location})`;
        if (!embedFields[locationName]) {
            embedFields[locationName] = `${capitalizeWords(fishObj.name)} (${kgToWeightString(fishObj.sizeMin)} - ${kgToWeightString(fishObj.sizeMax)})`;
        } else {
            embedFields[locationName] += `\n${capitalizeWords(fishObj.name)} (${kgToWeightString(fishObj.sizeMin)} - ${kgToWeightString(fishObj.sizeMax)})`;
        }
    }
    embedFields = Object.entries(embedFields).map(tuple => {
        return { name: tuple[0], value: tuple[1] };
    });

    let options = {
        title: `Family: ${capitalizeWords(familyName)}`,
        color: api.visuals.getColor('locations', firstLocation),
        description: embedDescription,
        fields: embedFields
    };
    let embed = await createEmbed(options);
    msg.channel.send(embed);
}
async function sendAllFamilyInfo(msg) {
    let FamilyInfo = api.fishing.getAllFamilyData();
    let embedFields = [{ name: 'Fish Families', value: '', inline: true }, { name: '\u200b', value: '', inline: true }, { name: '\u200b', value: '', inline: true }];
    let nextCol = 0;
    for (const [key, value] of Object.entries(FamilyInfo)) {
        embedFields[nextCol%3].value += `\n*${key} (${value.length})*`;
        nextCol++;
    }

    let options = {
        title: 'General Fish Info',
        color: api.visuals.getColor('cmd', 'familyinfo'),
        description: 'For information on a specific fish or family, use `.fishinfo <family/fish name>`\nFor example `.fishinfo bluegill`\n\u200b',
        fields: embedFields,
        footer: 'You are seeing this page because you used the .fishinfo command without any parameters'
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
    embedDescriptionEnd = '';
    if(unlockedLocations.includes(locationInfo.id)) {
        let fishArr = [];
        for(let fishChance of locationInfo.fish) {
            const fishInfo = api.fishing.getFishData(fishChance.id);
            fishArr.push({
                name: capitalizeWords(fishInfo.name),
                rarity: percentToRarity(fishChance.chance),
                sizeMin: kgToWeightString(fishInfo.sizeMin),
                sizeMax: kgToWeightString(fishInfo.sizeMax),
                sizeClass: fishInfo.sizeClass
            });
        }
        let sizeFields = {'Small': '', 'Medium': '', 'Large': '', 'Extra Large': ''};
        for(let fish of fishArr) {
            let sizeString = capitalizeWords(SIZE_CLASSES[fish.sizeClass-1]);
            sizeFields[sizeString] += `${fish.name} (${fish.sizeMin} - ${fish.sizeMax})\n`;
        }
        var embedFields = [
            {name: 'Small', value: sizeFields['Small'], inline: false},
            {name: 'Medium', value: sizeFields['Medium'], inline: false},
            {name: 'Large', value: sizeFields['Large'], inline: false},
            {name: 'Extra Large', value: sizeFields['Extra Large'], inline: false}
        ];
    } else {
        embedDescriptionEnd = '\n:closed_lock_with_key: You may view fish once you have unlocked this location';
    }
    // create embed
    let canvasBuffer = await createBackgroundShowcaseCanvas(IMAGES.bg[locationInfo.id.toString()]);
    let dailyData = await db.misc.daily.getCurrentEntry();

    let options = {
        title: `Location ${locationInfo.id} - ${locationInfo.name} ${WEATHER_ICONS[dailyData[`weather_${locationInfo.id}`]]}`,
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
    const dailyData = await db.misc.daily.getCurrentEntry();
    
    let embedDescription = '';
    for(let locationID of unlockedLocations) {
        let locationInfo = api.fishing.getLocationData(locationID);
        embedDescription += `(${locationID}) ${locationInfo.name} ${WEATHER_ICONS[dailyData[`weather_${locationID}`]]}\n`;
    }
    if(unlockedLocations.length !== api.fishing.getLocationDatasetLength()) { // due the locked
        let locationID = unlockedLocations[unlockedLocations.length-1] + 1;
        let locationInfo = api.fishing.getLocationData(locationID);
        embedDescription += `(${locationID}) ${locationInfo.name} :lock: \`(lvl. ${locationInfo.level})\``;
    }
    let options = {
        color: api.visuals.getColor('cmd', 'locationinfo'),
        title: 'Viewable Locations',
        description: embedDescription,
        footer: `New weather in ${millisToTimeString(dailyData.end_time - Date.now())}`
    };
    let embed = await createEmbed(options);
    msg.channel.send(embed);
}

async function sendInfo(msg, args) {
    let subject = args[0];
    const titles = api.text.getTitles('info');
    if(!titles.includes(subject)) {
        subject = 'General';
    }

    let options = {
        title: `Commands - ${subject}`,
        color: api.visuals.getColor('cmd', 'info'),
        description: api.text.getText('info', subject).map(str => str.replace(/\${PREFIX}/g, msg.prefix)).join('\n'),
        footer: subject === 'General' ? `Don't know what a command does? Just type ${msg.prefix}info [command name]` : ''
    };
    let embed = await createEmbed(options);
    msg.channel.send(embed);
}
module.exports.sendInfo = sendInfo;

async function sendHelp(msg, args, user) {
    const p = msg.prefix || '.';
    if (args[0] === '1') {
        var options = {
            title: 'Guide 1 - Getting Started',
            color: api.visuals.getColor('cmd', 'info'),
            description: `**Welcome to Big Tuna!**\
\nThis information will help you get started with Big Tuna!\
\n\n:one: Fish with \`${p}fish\` - this command has a 75 minute cooldown.\
\n:two: Check your aquarium with \`${p}aquarium\` - coins can be collected from here.\
\n:three: Vote with \`${p}vote\` to reset your fishing cooldown.\
\n:four: See your equipment with \`${p}equipment\` - upgrade with \`${p}shop\`\
\n:five: Use \`${p}help\` to for access to a help menu.\
\n\n**Relevant Guides**\
\nAquarium\
\nTier\
\nStats\
\n\n**That's it for the basics of gameplay (under level 10). Good luck!**`
            };
    } else if (args[0] === '2'){
        var options = {
            title: 'Guide 2 - Getting Started (Continued)',
            color: api.visuals.getColor('cmd', 'info'),
            description: `**Welcome to the second half of the start guide!**\
\nYou'll be comfortable with the way of Big Tuna in no time!\
\n\n:one: Collect aquarium money directly with \`${p}collect\`\
\n:two: Access a commands list with \`${p}cmd\`\
\n:three: Use \`${p}cmd [command]\` to see command shortcuts.\
\n:four: Use \`${p}cd\` to see cooldowns.\
\n:five: For anything you're unsure of, check the help menu!\
\n\n**Relevant Guides**\
\nInfo\
\nWeather\
\n\n**That's all you'll need until level 10. Happy fishing!**`
        }
    } else if (args[0] === '3') {
        var options = {
            title: 'Guide 3 - Level 10+',
            color: api.visuals.getColor('cmd', 'info'),
            description: `**Congrats on getting to level 10!**\
\nGet ready for a lot of new content!\
\n\n:one: Change locations with \`${p}setlocation 2\` - \`${p}sl\` for short.\
\n:two: Type \`${p}quest\` to view, claim rewards for, and reset your quest.\
\n:three: See the weekly bounty with \`${p}bounty\`\
\n:four: Use \`${p}baitshop\` to spend your :lollipop: from quests and bounties.\
\n:six: Regularly check \`${p}event\`\
\n\n**Relevant Guides**\
\nBait\
\nQuest\
\n\n**That's all you'll need until level 20. Enjoy!**`
        };
    } else if (args[0] === '4') {
        var options = {
            title: 'Guide 4 - Level 20+',
            color: api.visuals.getColor('cmd', 'info'),
            description: `**Congrats on getting to level 20!**\
\nGet ready for *even more* new content!\
\n\n:one: Check out new entries in the shop.\
\n:two: Use \`${p}cards\` & \`${p}card [ID]\` to view cards.\
\n:three: Use \`${p}rings\` & \`${p}ring [ID]\` to view rings.\
\n:four: Your level is now high enough to create a clan.\
\n\n**Relevant Guides**\
\nCard\
\nRing\
\n\n**Make sure you check out relevant guides! Things are getting complex...**`
        }
    } else if (args[0] === '5') {
        var options = {
            title: 'Guide 5 - Level 50+',
            color: api.visuals.getColor('cmd', 'info'),
            description: `**Just some brief information for levels 50+**\
\nAmazing job getting to such a late-game stage!\
\n\n:one: Swivels increase max weight for sharks.\
\n:two: Join the Offical Server. We'd love to have you join our clans!\
\n:three: Consider supporting bot development at the [Big Tuna Shop.](https://bigtuna.xyz/shop)\
\n\n**Hope you're doing well!**`
        }
    } else if (args[0] === 'stats') {
        var options = {
            title: 'Help Stats - Viewing Player Data',
            color: api.visuals.getColor('cmd', 'info'),
            description: `**Big Tuna provides detailed information to all of its players!**\
\nBelow are the commands to view that information.\
\n\n\`${p}stats\`\
\n\`${p}serverstats\`\
\n\`${p}equipment\`\
\n\`${p}leaderboards\`\
\n\`${p}fishleaderboards [fish]\`\
\n\n*To view the stats of others, they must be opted in.*`
        }
    } else if (args[0] === 'info') {
        var options = {
            title: 'Help Info - Using the Information System',
            color: api.visuals.getColor('cmd', 'info'),
            description: `**View game information with these powerful commands!**\
\nFor the sake of convenience, shortcuts are used below.\
\n\n**Location Info**\
\nType \`${p}li\` to pull up a list of available locations and their weather.\
\nType \`${p}li [ID]\` to view information about a specific location.\
\n\n**Fish Info**\
\nType \`${p}fi\` to pull up a list of all fish families.\
\nType \`${p}fi [family]\` to view all unlocked fish of a given family.\
\nType \`${p}fi [fish]\` to view information about a specific fish.\
\n\n**Item Info**\
\nType \`${p}ii [equipment type]\` to view all items of a certain type.\
\n[equipment type] must be one of: rod, hook, line, aquarium, glove, ring, swivel, bait.\
\nType \`${p}ii [item name]\` to view a specific equipment piece or item.`
        }
    } else if (args[0] === 'tier') {
        var options = {
            title: 'Help Tier - Tiers Explained',
            color: api.visuals.getColor('cmd', 'info'),
            description: `**Every fish that is caught has a tier.**\
\nThe tier represents how large a fish is __for its species__.\
\n\n**Here is a list of tiers, from best (largest) to worst (smallest)**\
\n**SS** - Top 1%\
\n**S** - Top 10%\
\n**A** - Top 25%\
\n**B** - Top 40%\
\n**C** - Top 70%\
\n**D** - Bottom 30%\
\n**F** - A boot`
        }
    } else if (args[0] === 'aquarium') {
        var options = {
            title: 'Help Aquarium - Aquariums Explained',
            color: api.visuals.getColor('cmd', 'info'),
            description: `**Your aquarium serves as a record of your best catches**\
\nYour largest catch for each species is kept in the aquarium.\
\nEach location has its own aquarium.\
\nView with \`${p}aquarium [ID]\`\
\nView other fisher's aquariums with \`${p}aquarium [ID] [@user]\`\
\n\n**Aquariums generate money**\
\nCollect from ALL aquariums with \`${p}collect\`\
\nCoin generation is determined by the **quantity**, **tier**, and **size** of your fish.\
\nUpgrade your aquarium in the shop to increase coin capacity and generation.`
        }
    } else if (args[0] === 'weather') {
        var options = {
            title: 'Help Weather - A Guide to Weather',
            color: api.visuals.getColor('cmd', 'info'),
            description: `**Weather changes on a daily basis and impacts fish spawns**\
\nWeather for all locations can be viewed with \`${p}li\`\
\n\n**Below is a list of all possible weather**\
\n:sunny: Sunny - More small fish. Much lower tiers.\
\n:partly_sunny: Partly Sunny - Lower tiers.\
\n:cloud: Cloudy - No special effects.\
\n:cloud_rain: Rainy - More large fish. Higher tiers.\
\n:thunder_cloud_rain: Storms - More large fish. Much higher tiers. Legendary chance.`
        }
    } else if (args[0] === 'supporter') {
        var options = {
            title: 'Help Supporter - Supporting Big Tuna',
            color: api.visuals.getColor('cmd', 'info'),
            description: `**Support Big Tuna's long-run survival and earn some nice perks!**\
\nAlso encourages more frequent and higher-quality updates!\
\n\n:sushi: **Supporter - $1.50** :sushi:\
\n- Get a nice sashimi-color border on a variety of commands.\
\n\n:trophy: **Big Supporter - $10.00** :trophy:\
\n- Get an epic golden border on a variety of commands.\
\n- Gain the **Time Accumulation** perk.\
\n- This lets you use missed fish time (up to 1 rod cooldown) on your next catch.\
\n- If you have several of this perk, you may gift it with \`${p}giftpremium [@user]\`.\
\n- Giftable status appears in your stats page.\
\n\n:shark: **Custom Fish - $20.00** :shark:\
\n- Giftable status will appear in your stats page.\
\n- Use \`${p}redeem\` in a server of your choosing to give them the perk.\
\n- Server will get an epic golden border on the server stats page.\
\n- Server moderators will be able to map any word to \`${p}fish\` using \`${p}scf [word]\`\
\n\nVisit the [Big Tuna Shop](https://bigtuna.xyz/shop) to acquire these perks!\
`
        }
    } else if (args[0] === 'quest') {
        var options = {
            title: 'Help Quest - Quests & Bounties',
            color: api.visuals.getColor('cmd', 'info'),
            description: `**Quests and bounties both serve as ways to acquire :lollipop:**\
\nStatistically, bounties are more rewarding.\
\n\n**Quests**\
\nThe \`${p}quest\` command is used to view, reset, and claim rewards for a quest.\
\nAfter claiming a quest reward, type \`${p}quest\` to view your next quest.\
\nQuests can be reset after 3 days.\
\n\n**Bounties**\
\nThe \`${p}bounty\` command is used to view the weekly bounty.\
\nBounties come in the form: Catch a [species] of at least [tier].\
\nEach week's bounty can only be completed once.`
        }
    } else if (args[0] === 'bait') {
        var options = {
            title: 'Help Bait - Everything About Baits',
            color: api.visuals.getColor('cmd', 'info'),
            description: `**Baits are purchased with :lollipop:**\
\nBaits impact the fish that spawn when you fish.\
\n\n**Getting and Managing Baits**\
\nBaits are purchased with \`${p}baitshop\` - only buy good deals!\
\nThe bait shop refreshes daily.\
\nTo view information about a bait, use \`${p}ii [bait]\`\
\nView your baits with \`${p}bait\`\
\n\n**Using Bait**\
\nType \`${p}fish [bait]\` to use a bait.\
\nUsing \`${p}fish\` will assume no bait as usual.`
        }
    } else if (args[0] === 'clan') {
        var options = {
            title: 'Help Clan - Everything About Clans',
            color: api.visuals.getColor('cmd', 'info'),
            description: `**Clans are a great way to fish alongside your friends!**\
\nJoin a fishing clan for exclusive rewards, perks, and competitions!\
\nThere are 3 roles within a clan: **Member**, **Trusted Member** :reminder_ribbon:, and **Leader** :crown:\
\nA clan\'s experience is determined by quantity of fish caught :fish:\
\n\n**Perks (Accumulative)**\
\n:star: (<100 :fish:): ***-1%** fishing cooldown*\
\n:star::star: (<500 :fish:): ***+5%** coins per catch*\
\n:star::star::star: (<2000 :fish:): ***+5%** exp per catch*\
\n:star::star::star::star: (<10000 :fish:): ***2 day** quest reroll timer*\
\n:star::star::star::star::star: (<50000 :fish:): ***+10%** aquarium coin capacity*\
\n:star::star::star::star::star::star: (50000+ :fish:): ***+5%** max weight*\
\n\n**Clan Commands**\
\n\`${p}clan\` - View your clan page\
\n\`${p}members\` - View info about your clan members\
\n\`${p}campaign\` - View clan campaign status\
\n\`${p}clanshop\` - Purchase clan perks with clan points\
\n\`${p}clanperks\` - View summary of clan perks\
\n\`${p}createclan\` - Create a new clan (lvl. 20, 5000 coins)\
\n\`${p}rename [name]\` - Rename your clan (you have limited renames)\
\n\`${p}join [ID] [password (optional)]\` - Join a clan\
\n\`${p}leave\` - Leave a clan\
\n:reminder_ribbon: \`${p}password\` - View clan password\
\n:reminder_ribbon: \`${p}newpassword\` - Generate a new clan password\
\n:reminder_ribbon: \`${p}nopassword\` - Turn off passwords for your clan\
\n:reminder_ribbon: \`${p}promote [@user]\` - Promote someone\
\n:reminder_ribbon: \`${p}demote [@user]\` - Demote someone\
\n:reminder_ribbon: \`${p}kick [@user]\` - Kick someone\
\n*[@user] can either be a ping or a username (with tag)*\
\n\nA complete commands guide for clans can be found at our [Official Commands Page](https://bigtuna.xyz/commands/clans)`
        }
    } else if(args[0] === 'campaign') {
        var options = {
            title: 'Help Campaign - Campaigns (A Clan Feature)',
            color: api.visuals.getColor('cmd', 'info'),
            description: `**Work through the campaign stages with your clan!**\
\n\`${p}campaign\` or \`${p}ca\` can be used to view stage details.\
\n\n**Campaign Rewards**\
\nOnce a stage is completed, the **Clan Leader** :crown: must collect the rewards to move the clan onto the next stage.\
\n\nClan Points will go to the clan for the clan shop :shield:\
\nQuest Points will be received by everyone in the clan :lollipop:\
\nCoins will be received by everyone in the clan :coin:\
\n\n**Clan Upgrades**\
\nThe clan shop can be accessed with \`${p}clanshop\`\
\nPerks can be viewed with \`${p}clanperks\`\
\nUpgrades purchased in the shop are granted to all clan members.\
\nOnly **Trusted Members** :reminder_ribbon: or the **Clan Leader** :crown: can purchase from the clan shop.\
\n\n**Other Details**\
\nAll clans progress through the exact **same** campaign stages.
\nEach member can only contribute 1 campaign catch per day.`
        }
    } else if(args[0] === 'markers') {
        var options = {
            title: 'Help Markers - Activity Markers (Squares)',
            color: api.visuals.getColor('cmd', 'info'),
            description: `**Activity markers are shown in the clan and members pages.**\
\n\n:green_square: **Active** - Last fished under 7 days ago\
\n:yellow_square: **Semi Active** - Last fished under 2 weeks ago\
\n:red_square: **Inactive** - Last fished over 2 weeks ago\
\n:blue_square: **Active & Contributed** - Contributed to campaign today\
\n:white_large_square: **Joined Today** - Cannot contribute to campaign`
        }
    } else if (args[0] === 'rings' || args[0] === 'ring') {
        var options = {
            title: 'Help Rings - A Special Equipment Type',
            color: api.visuals.getColor('cmd', 'info'),
            description: `**Rings impact the quantity and quality of card drops**\
\nWhen you fish the chance of getting a card depends on your ring.\
\n\n**Rings are bought in the shop in the form of packs**.\
\nRegular packs give a regular type ring.\
\nPremium packs have a 30% chance to give a premium ring type.\
\nPremium packs also boost every aspect of a ring.\
\nAt levels 20, 40, 60, 80, 100, the price and quality of packs increases.\
\n\n**Stats**\
\nEvery ring has unique "size drop" stats *(eg. S: 1%, M: 2%, L: 1.5%, XL: 1%)*.\
\nThis represents the chance of a card dropping for every fish size.\
\nEvery ring has unique "grade chance" stats.\
\nThis represents the chance a card is a certain grade.\
\nRings also have abilities that are unique **to their material**.\
\n\n**Navigating the Commands**\
\n\`${p}shop\` - Buy a ring pack (1 ring).\
\n\`${p}equipment\` - See a simplified view of your equipped ring.\
\n\`${p}ring\` - View your rings.\
\n\`${p}ring [ID]\` - View, equip, or sell a ring. :white_check_mark: :moneybag:\
\n\`${p}ii rings\` - View all ring types.\
\n\`${p}ii [ring type]\` - View a ring type.\
\n\nWhen viewing equipment, simplified stats for the ring are shown.\
\nThese stats account for the type-specific ability.\
\nUse \`${p}givering [ID] [@user]\` to give rings.`
        }
    } else if (args[0] === 'cards' || args[0] === 'card') {
        var options = {
            title: 'Help Cards - Collecting Cards',
            color: api.visuals.getColor('cmd', 'info'),
            description: `**Cards are a fun feature unlocked at level 20**\
\nYou must have a ring to get cards in the first place.\
\n\n**Viewing Cards**\
\nType \`${p}card\` to view your cards.\
\nType \`${p}card [ID]\` to view a specific card.\
\n\n**Using Cards**\
\nCards are used through reactions on the card page.\
\nSell cards for quest points. :lollipop:\
\nRedeem cards to your aquarium. :truck:\
\nThis is only available if the card is good enough to replace your personal best.\
\nUse \`${p}givecard [ID] [@user]\` to give cards.`
        }
    } else if (args[0] === 'skins' || args[0] === 'skin') {
        let canvasBuffer = await createSkinHelpCanvas();
        var options = {
            title: 'Help Skin - Special Skins',
            color: api.visuals.getColor('cmd', 'info'),
            description: `**Skins are exclusive items that affect the game's visuals**\
\nAll players, regardless of level, can collect skins.\
\n\n**Skin Commands**\
\n\`${p}skin\` - View your skins\
\n\`${p}skin [ID]\` - View/equip/unequip/delete one of your skins\
\n\`${p}giveskin [ID] [@user]\` - Give a user one of your skins\
\n\n**How Do I Get Skins?**\
\nYou can acquire skins through events (check \`${p}event\`).\
\nGiveaways and server events in the [Official Server](https://discord.gg/RaN2VE9zpa) may also reward skins.\
`,
            attachment: { name: 'skins.png', content: canvasBuffer }
        };
    } else if (!args[0] || args[0] === 'menu' || args[0] === 'm' || args[0]) {
        var options = {
            title: 'Help Menu - Detailed Guides for Big Tuna',
            color: api.visuals.getColor('cmd', 'info'),
            description: `:earth_americas: **Gameplay Guides**\
\n\`${p}guide 1\` - Getting Started\
\n\`${p}guide 2\` - Getting Started (Continued)\
\n\`${p}guide 3\` - Level 10+\
\n\`${p}guide 4\` - Level 20+\
\n\`${p}guide 5\` - Level 50+\
\n\n:nerd: **Concepts**\
\n\`${p}help stats\` - Viewing Player Data\
\n\`${p}help info\` - Viewing Game Data\
\n\`${p}help tier\` - Tiers Explained\
\n\`${p}help aquarium\` - Aquariums Explained\
\n\`${p}help weather\` - A Guide to Weather\
\n\n:star2: **Features**\
\n\`${p}help supporter\` - Supporting Big Tuna\
\n\`${p}help quest\` - Quests & Bounties\
\n\`${p}help bait\` - Everything About Baits\
\n\`${p}help ring\` - A Special Equipment Type\
\n\`${p}help card\` - Collecting Cards\
\n\`${p}help skin\` - Special Skins\
\n\n:shield: **Clan**\
\n\`${p}help clan\` - Everything About Clans\
\n\`${p}help campaign\` - Campaigns\
\n\`${p}help markers\` - Activity Markers (Squares)\
\n\n**Helpful Links**\
\n[Invite Big Tuna](https://discord.com/oauth2/authorize?client_id=803361191166607370&permissions=59456&scope=bot) | \
[Official Discord Server](https://discord.gg/RaN2VE9zpa) | \
[Online Commands Page](https://bigtuna.xyz/commands)\
\n\n**For a list of commands, type \`${p}cmd\`**`
        }
    } else {
        return;
    }

    let embed = await createEmbed(options);
    msg.channel.send(embed);
}

async function sendEvent(msg) {
    let eventEntry = await db.events.getUpcomingEvent();
    if(!eventEntry) {
        var options = {
            color: api.visuals.getColor('event', 'none'),
            title: 'No Upcoming Events',
            description: 'Check back later! :mailbox_with_no_mail:'
        };
    } else {
        eventEntry.description = eventEntry.description.replace(/\\n/g, '\n');
        if(eventEntry.start_time > Date.now()) {
            var embedDescription = {
                time: `Starts in: **${millisToTimeString(eventEntry.start_time - Date.now())}** :alarm_clock:`,
                duration: `Duration: **${millisToTimeString(eventEntry.end_time - eventEntry.start_time)}** :stopwatch:\n`,
                description: eventEntry.description
            }
            var options = {
                color: api.visuals.getColor('event', 'pending'),
                title: `Upcoming - ${eventEntry.name}`,
                description: Object.values(embedDescription)
            };
        } else {
            var embedDescription = {
                duration: `Ends in: **${millisToTimeString(eventEntry.end_time - Date.now())}** :stopwatch:\n`,
                description: eventEntry.description
            }
            var options = {
                color: api.visuals.getColor('event', 'current'),
                title: `Event - ${eventEntry.name}`,
                description: Object.values(embedDescription)
            };
        }
        
    }
    let embed = await createEmbed(options);
    msg.channel.send(embed);
}