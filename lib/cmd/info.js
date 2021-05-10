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
    'info': ['commands', 'command', 'cmd', 'cmds'],
    'help': [],
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
            options.fields[Math.floor(itemCount/21)].value += `\n${capitalizeWords(item.name)} ${equipmentPiece}`;
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
    } else if (api.gamedata.getAllBaitNames().includes(itemName)) {
        const baitInfo = api.gamedata.getBaitData(itemName);
        options.title += ` (bait)`;
        options.description = `Rating: ${':star:'.repeat(baitInfo.stars)}\nRecommended Price: ${baitInfo.value} :lollipop:`;
        if (baitInfo.tier !== 'D') { options.description += `\n- Minimum fish tier: **${baitInfo.tier}**`; }
        if (baitInfo.sizes.length !== 4) { options.description += `\n - Catches exclusively **${baitInfo.sizes.map(num => SIZE_CLASSES[num-1]).join(', ')}** fish`; }
        if (baitInfo.families.length !== 0) { options.description += `\n - More likely to catch **${baitInfo.families.join(', ')}**`; }
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
        description: familyInfo.length === 0 ? `You have not yet unlocked any fish in the **${capitalizeWords(familyName)}** family.\n\nTry again when you unlock a new location!` : `Showing all unlocked fish in the **${capitalizeWords(familyName)}** family.`,
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
    if(!titles.includes(subject)) {
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

async function sendHelp(msg, args, user) {
    if (!args[0] || args[0] === '1') {
        var options = {
            title: 'Help 1 - Getting Started',
            color: api.visuals.getColor('cmd', 'info'),
            description: '**Welcome to Big Tuna!**\n\
            Try these steps to get started:\n\n\
            :one: Type `.fish` and react with :hook:\n\
            :two: Type `.aquarium` and see the fish you caught (if you *did* catch a fish) :fish:\n\
            :three: Vote with `.vote` and fish again! :arrow_up:\n\
            :four: Check your stats with `.stats` :chart_with_upwards_trend:\n\
            :five: See more cool info with `.leaderboards` and `.serverstats` :eyes:\n\
            :six: Access more advanced tips with `.help 2`\n\n\
            **Helpful Links**\n\
            [Invite Big Tuna](https://discord.com/oauth2/authorize?client_id=803361191166607370&permissions=59456&scope=bot) | \
            [Community Server](https://discord.gg/RaN2VE9zpa) | \
            [Official Help Guide](https://bigtuna.xyz/start) | \
            [Official Commands Page](https://bigtuna.xyz/commands)\n\n\
            A commands list can be found with `.info`'
        };
    } else if (args[0] === '2'){
        var options = {
            title: 'Help 2 - Getting to Level 10',
            color: api.visuals.getColor('cmd', 'info'),
            description: '**At level 10, you\'ll unlock LOADS of features**\n\
            Here are some tips to get you there:\n\n\
            :one: Upgrade your equipment with `.shop` :shopping_bags:\n\
            :two: Use `.equipment` to view your stuff :mag:\n\
            :three: Max weight is that of your **weakest** piece of equipment :pinching_hand:\n\
            :four: Collect coins from your aquarium :coin:\n\
            :five: Use info commands (try `.iteminfo hooks`) :brain:\n\
            :six: Join the Community Server in case of giveaways :tada:\n\n\
            **Already level 10?**\nCheck out `.help 3`'
        }
    } else if (args[0] === '3') {
        var options = {
            title: 'Help 3 - Level 10 Unlocks',
            color: api.visuals.getColor('cmd', 'info'),
            description: '**Congrats on getting to level 10!**\n\
            Here\'s what\'s new:\n\n\
            :one: Set your location with `.setlocation 2` :map:\n\
            :two: View your quest with `.quest` :lollipop:\n\
            :three: See the weekly bounty with `.bounty` :skull:\n\
            :four: Visit the baitshop with `.baitshop` :worm:\n\
            :five: Use `.a 1` and `.a 2` to see aquariums :truck:\n\
            :six: Keep an eye out for events with `.event` :eye:\n\n\
            **Baits**\n\
            - Usage: `.fish <bait name>`\n\
            - Affects fish tier and size class\n\
            - Targets certain subspecies\n\
            - View effects with `.iteminfo` (e.g. `.ii dragonfly`)\n\n\
            Also, for your convenience, the `.collect` command exists'
        };
    } else if (args[0] === '4') {
        var options = {
            title: 'Help 4 - Level 20 Unlocks',
            color: api.visuals.getColor('cmd', 'info'),
            description: '**For the most accomplished of fishers...**\n\n\
            :one: Set your location with `.setlocation 3` :map:\n\
            :two: Check out the new equipment type! :gloves:\n\
            :three: Watch for card drops when you fish :slot_machine:\n\n\
            - Cards have a 2% chance of dropping (for level 20+)\n\
            - View cards with `.cards` or `.cards <card ID>`\n\
            - They can be sold for :lollipop: by reacting with :moneybag:\n\
            - They can be given using `.givecard <card ID> @user`\n\
            - The grade of a card **only affects sell price**\n\
            - The fish on a card can go in your aquarium (if it would be your best) :truck:\n\n\
            **Great job getting this far!**\n\
            If you\'re not in it already, we\'d love to have you join our Community Server for:\n\
            :small_blue_diamond: Bot updates\n\
            :small_blue_diamond: Giveaways\n\
            :small_blue_diamond: News leaks\n\
            :small_blue_diamond: Suggestions\n\
            :small_blue_diamond: Fishing!'
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