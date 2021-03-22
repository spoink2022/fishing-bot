const api = require('../../api');
const db = require('../../db');
const auth = require('../../static/private/auth.json');

const { createCanvasForFishingPre, createCanvasForFishingPost, createCanvasForAquarium } = require('../misc/canvas.js');
const { millisToTimeString, millisToDays } = require('../misc/datetime.js');
const { createEmbed } = require('../misc/embed.js');
const { capitalizeWords, convertQuestToString, kgToKgString, kgToWeightString } = require('../misc/str_functions.js');
const gameLogic = require('../misc/game_logic.js');
const shopProcessing = require('../global/shopProcessing.js');

const NumWordMapList = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];

let shoppingUsers = [];

async function attemptReply(msg, str) {
    if(msg.channel.type === 'dm') { msg.channel.send(str); }
    else { msg.reply(str); }
}

module.exports.c = {
    'fish': ['f', 'fis', 'fishy'],
    'aquarium': ['a', 'aq'],
    'collect': ['c'],
    'shop': [],
    'setlocation': [],
    'quest': ['q', 'quests'],
    'baitshop': []
};

module.exports.run = async function(msg, cmd, args, user) {
    if(cmd === 'fish') { sendFish(msg, args, user); }
    else if(cmd === 'aquarium') { sendAquarium(msg, args, user); }
    else if(cmd === 'collect') { sendCollect(msg, args, user); }
    else if(cmd === 'shop') { sendShop(msg, user); }
    else if(cmd === 'setlocation') { sendSetLocation(msg, args, user); }
    else if(cmd === 'quest') { sendQuest(msg, user); }
    else if(cmd === 'baitshop') { sendBaitShop(msg, user); }
}

async function sendFish(msg, args, user) {
    const rodInfo = api.fishing.getRodData(user.rod);
    // check to ensure user is not on cooldown
    let rodCooldown = rodInfo.cooldown;
    if (user.premium === 1) { rodCooldown /= 100; }
    else if (user.premium === 2) { rodCooldown = 0; }
    let remainingCooldown = user.cooldown+rodCooldown-Date.now();
    if (remainingCooldown > 0) { // can't fish yet
        msg.channel.send(`Please wait **${millisToTimeString(remainingCooldown)}** to fish again!`);
        return;
    }
    // handle bait stuff
    let minTier = 'D';
    let sizeClasses = [1, 2, 3, 4];
    let baitUsed = false;
    if (args[0]) {
        const baitNames = api.gamedata.getAllBaitNames();
        if (!baitNames.includes(args[0])) {
            attemptReply(msg, `\`${args[0]}\` is not a valid bait!`);
            return;
        }
        const userInventory = await db.users.fetchInventory(msg.author.id);
        if (userInventory[args[0]] === 0) {
            attemptReply(msg, `You don't have any ${args[0]}!`);
            return;
        }
        baitUsed = true;
        const baitInfo = api.gamedata.getBaitData(args[0]);
        minTier = baitInfo.tier;
        sizeClasses = [];
        if (baitInfo.catchSmaller) {
            for (let i=1; i <= baitInfo.sizeClass; i++) { sizeClasses.push(i); }
        } else {
            for (let i=4; i >= baitInfo.sizeClass; i--) { sizeClasses.push(i); }
        }
        db.users.updateInventory(msg.author.id, args[0], -1);
    }

    await db.users.resetFishingCooldown(msg.author.id);

    // generate fish, canvas
    let locationInfo = api.fishing.getLocationData(user.location);
    // if bait used, no trash (ie id !== 0)
    let possibleFishIDs = gameLogic.getPossibleFishIDs(locationInfo.trashChance, locationInfo.fish, sizeClasses, baitUsed);
    let possibleFish = gameLogic.getPossibleFish(possibleFishIDs, minTier); // takes IDs and returns fish objects
    let res = await createCanvasForFishingPre(user, possibleFish, locationInfo.zoom, rodInfo.size, baitUsed ? args[0] : false);
    let canvas = res[0], centerCoords = res[1];
    
    // generate & send embed
    const embedColor = api.visuals.getColor('locations', user.location.toString());
    let options = {
        color: embedColor,
        author: [`${msg.author.tag} (Lvl. ${user.level})`, msg.author.displayAvatarURL()],
        title: `Location ${locationInfo.id} - ${locationInfo.name}`,
        description: baitUsed ? `Used bait: \`${args[0]}\`` : null,
        attachment: { name: 'fishing.png', content: await canvas.toBuffer()}
    };
    let embed = await createEmbed(options);
    await msg.channel.send(embed).then(async (sentEmbed) => {
        let fish = possibleFish[0];
        let fishInfo = api.fishing.getFishData(fish.id);
        fish.centerCoords = centerCoords;
        let descriptionSuffix = '';

        // determine coins and exp gained + consider a level up
        const lineInfo = api.fishing.getLineData(user.line);
        const hookInfo = api.fishing.getHookData(user.hook);
        const rodInfo = api.fishing.getRodData(user.rod);
        const lineSnapped = fish.weight > Math.min(lineInfo.maxWeight, hookInfo.maxWeight, rodInfo.maxWeight);
        let coinsGained = fish.tier === 'f' ? 0 : fish.weight * fishInfo.value;
        let expGained = Math.max(Math.ceil(Math.sqrt(coinsGained * 10)), 1) + lineInfo.bonus;
        // apply coin & exp modifiers
        coinsGained *= hookInfo.multiplier;
        coinsGained = fish.tier === 'f' ? 0 : Math.max(Math.ceil(coinsGained), 2);

        if(lineSnapped) {
            coinsGained = 0;
            expGained = 2;
        }

        let expRequired = api.playerdata.getPlayerLevelInfo(user.level).expRequired;
        await db.users.creditCoinsAndExp(msg.author.id, coinsGained, expGained).then(updatedExp => {
            while(updatedExp >= expRequired) {
                descriptionSuffix += `\nLeveled up to Lvl. ${user.level + 1}! :arrow_up:`;
                db.users.incrementLevel(msg.author.id, expRequired);
                updatedExp -= expRequired;
                expRequired = api.playerdata.getPlayerLevelInfo(user.level + 1).expRequired;
                user.level++;
                if(api.fishing.getAllLocationData().map(obj => obj.level).includes(user.level)) {
                    descriptionSuffix += `\nYou unlocked a new location! :map:`;
                }
            }
        });

        // handle aquarium, stats, and quest stuff
        if(fish.tier !== 'f' && !lineSnapped) {
            // aquarium
            var oldAquariumEntry = await db.aquarium.getLargestSize(msg.author.id, fishInfo.name);
            if(!oldAquariumEntry || oldAquariumEntry < fish.sizeMult) {
                db.aquarium.setLargestSize(msg.author.id, fishInfo.name, fish.sizeMult);
                descriptionSuffix += `\nPersonal best ${fishInfo.name} catch! Sent to aquarium :truck:`;
            }
            // stats
            db.stats.integrateCatch(msg.author.id, fish.weight);
            // quests
            const TIER_RANKS = {'ss': 5, 's': 4, 'a': 3, 'b': 2, 'c': 1, 'd': 0};
            if(user.quest && user.quest.progress < user.quest.qt) {
                if(user.quest.type === 'catch_tier') {
                    if(TIER_RANKS[fish.tier] >= TIER_RANKS[user.quest.tier.toLowerCase()]) {
                        user.quest.progress++;
                        await db.users.updateQuest(user.userid, convertQuestToString(user.quest));
                        if(user.quest.progress === user.quest.qt) { // quest complete
                            descriptionSuffix += `\nQuest Complete! (${user.quest.progress}/${user.quest.qt}) :white_check_mark:`;
                            descriptionSuffix += '\n(type `.quest` to view and claim your quest rewards)';
                        } else {
                            descriptionSuffix += `\nCounts toward quest! (now ${user.quest.progress}/${user.quest.qt}) :clock${Math.floor(user.quest.progress)%12+1}:`;
                        }
                    }
                } else if(user.quest.type === 'catch_weight') {
                    user.quest.progress += fish.weight;
                    user.quest.progress = Math.min(Math.round(user.quest.progress*1000)/1000, user.quest.qt);
                    await db.users.updateQuest(user.userid, convertQuestToString(user.quest));
                    if(user.quest.progress == user.quest.qt) { // quest complete
                        descriptionSuffix += `\nQuest Complete! (${user.quest.progress}/${kgToKgString(user.quest.qt)}) :white_check_mark:`;
                        descriptionSuffix += '\n(type `.quest` to view and claim your quest rewards)';
                    } else {
                        descriptionSuffix += `\nCounts toward quest! (now ${user.quest.progress}/${kgToKgString(user.quest.qt)}) :clock${Math.floor(user.quest.progress)%12+1}:`;
                    }
                } else if(user.quest.type === 'catch_fish') {
                    if(user.quest.name === fishInfo.name.replace(/ /g, '_')) {
                        user.quest.progress++;
                        await db.users.updateQuest(user.userid, convertQuestToString(user.quest));
                        if(user.quest.progress === user.quest.qt) {
                            descriptionSuffix += `\nQuest Complete! (${user.quest.progress}/${user.quest.qt}) :white_check_mark:`;
                            descriptionSuffix += '\n(type `.quest` to view and claim your quest rewards)';
                        } else {
                            descriptionSuffix += `\nCounts toward quest! (now ${user.quest.progress}/${user.quest.qt}) :clock${Math.floor(user.quest.progress)%12+1}:`;
                        }
                    }
                }
            }
        }

        // create canvas & embed
        let newCanvasBuffer = await createCanvasForFishingPost(locationInfo.id, canvas, fish, lineSnapped, locationInfo.zoom);
        let fishWeightString = kgToWeightString(fish.weight);
        let options = {
            color: embedColor,
            author: [`${msg.author.tag} (Lvl. ${user.level})`, msg.author.displayAvatarURL()],
            title: `Caught ${fish.tier === 'f' ? 'trash!' : `a${['a', 'e', 'i', 'o', 'u'].includes(fishInfo.name[0]) ? 'n' : ''} ${fishInfo.name}!`}`,
            description: `${baitUsed ? `Used bait: \`${args[0]}\`\n` : ''}Gained ${coinsGained} coins! :coin:\nGained ${expGained} exp! :star:${descriptionSuffix}`,
            fields: fish.tier === 'f' || lineSnapped ? [] : [{ name: 'Weight :scales:', value: fishWeightString, inline: true }],
            attachment: { name: 'catch.png', content: newCanvasBuffer}
        };
        if(lineSnapped) { 
            options.title = `Oh no, your line snapped on a ${fishWeightString} ${fishInfo.name}!`; 
            options.description = `The fish got away!\n` + options.description;
            options.footer = `Use "${PREFIX}equipment" to view your equipment`;
        }
        let embed = await createEmbed(options);
        sentEmbed.react('\ud83e\ude9d').then(() => {
            const filter = ( reaction, user ) => reaction.emoji.name === '\ud83e\ude9d' && user.id === msg.author.id;
            const collector = sentEmbed.createReactionCollector(filter, { time: 10000 });
            collector.on('collect', () => collector.stop());
            collector.on('end', async() => {
                await sentEmbed.delete();
                msg.channel.send(embed);
            });
        });
    });
}

async function sendAquarium(msg, args, user) {
    let locationID = parseInt(args[0] || user.location);
    const LocationInfo = api.fishing.getLocationData(locationID);
    if(!locationID || !LocationInfo) {
        attemptReply(msg, `\`${args[0]}\` is not a valid location ID!`);
        return;
    } else if(user.level < LocationInfo.level) {
        attemptReply(msg, 'You have not unlocked this location yet!');
        return;
    }
    const embedColor = api.visuals.getColor('locations', locationID.toString());
    const AquariumInfo = api.gamedata.getAquariumInfo(user.aquarium_level);
    let earnings = await gameLogic.getAquariumEarnings(locationID, user);
    let earnRate = await gameLogic.getAquariumEarnRate(locationID, user);
    let fishContents = await gameLogic.getAquariumFishContent(locationID, user);

    let canvasBuffer = await createCanvasForAquarium(locationID, AquariumInfo.name.replace(/ /g, '_'), fishContents);
    // creating embed field
    let fishFound = 0, totalFish = 0;
    let embedFieldVal = '\u200b';
    for(const[key, val] of Object.entries(fishContents)) {
        if(val) {
            fishFound++;
            let weightStr = val.weight > 1 ? val.weight.toString()+'kg' : Math.round(val.weight*1000).toString()+'g';
            embedFieldVal += `**(${val.tier.toUpperCase()})** ${capitalizeWords(key.replace(/_/g, ' '))} - ${weightStr}\n`;
        }
        totalFish++;
    }
    // creating embed
    let options = {
        color: embedColor,
        author: [`${msg.author.tag} (Lvl. ${user.level})`, msg.author.displayAvatarURL()],
        title: `Aquarium - ${LocationInfo.name} (${Math.round(earnRate*10)/10}/hr)`,
        description: `Coins Earned: ${Math.floor(earnings)}/${AquariumInfo.max} :coin:`,
        fields: { name: `${fishFound}/${totalFish} Fish Found`, value: embedFieldVal },
        attachment: { name: 'aquarium.png', content: canvasBuffer }
    }
    let embed = await createEmbed(options);

    msg.channel.send(embed).then(async (sentEmbed) => {
        sentEmbed.react('\ud83e\ude99');
        const filter = ( reaction, user ) => reaction.emoji.name === '\ud83e\ude99' && user.id === msg.author.id;
        const collector = sentEmbed.createReactionCollector(filter, { time: 10000 });
        collector.on('collect', async () => {
            user = await db.users.fetchUser(user.userid); // refetch values
            sendCollect(msg, [locationID.toString()], user);
            collector.stop();
        });
        collector.on('end', async() => {
            const hasManageMessagesPermissions = msg.channel.type === "text" && (await msg.guild.members.fetch(client.user.id)).hasPermission('MANAGE_MESSAGES');
            if(hasManageMessagesPermissions) { sentEmbed.reactions.removeAll(); }
        });
    });
}

async function sendCollect(msg, args, user) {
    let locationID = parseInt(args[0]) || 'all';
    if(locationID === 'all') {
        sendCollectAll(msg, user);
        return;
    }
    const LocationInfo = api.fishing.getLocationData(locationID);
    if(!locationID || !LocationInfo) {
        attemptReply(msg, `\`${locationID}\` is not a valid location ID!`);
        return;
    } else if(user.level < LocationInfo.level) {
        attemptReply(msg, `You have not unlocked this location yet!`);
        return;
    }

    let earnings = await gameLogic.getAquariumEarnings(locationID, user);
    if(earnings < 1) {
        attemptReply(msg, `You must have at least 1 coin in an aquarium to collect!`);
        return; 
    }
    let toCollect = Math.floor(earnings);
    const embedColor = api.visuals.getColor('locations', locationID.toString());
    let options = {
        color: embedColor,
        author: [`${msg.author.tag} (Lvl. ${user.level})`, msg.author.displayAvatarURL()],
        title: `You collected ${toCollect} coin${toCollect > 1 ? 's' : ''}! :coin:`
    };
    db.users.collectAquariumEarnings(msg.author.id, toCollect, locationID);
    let embed = await createEmbed(options);
    msg.channel.send(embed);
}

async function sendCollectAll(msg, user) {
    let unlockedLocations = api.fishing.getUnlockedLocations(user.level);
    let totalEarnings = 0;
    for(const locationID of unlockedLocations) {
        totalEarnings += await gameLogic.getAquariumEarnings(locationID, user);
    }
    totalEarnings = Math.floor(totalEarnings);
    if(totalEarnings === 0) {
        attemptReply(msg, `You don't have any coins in your aquariums to collect!`);
        return;
    }
    db.users.collectAllAquariumEarnings(msg.author.id, totalEarnings, unlockedLocations);
    let options = {
        color: api.visuals.getColor('cmd', 'collect'),
        author: [`${msg.author.tag} (Lvl. ${user.level})`, msg.author.displayAvatarURL()],
        title: `You collected a total of ${totalEarnings} coin${totalEarnings > 1 ? 's' : ''}!`
    }
    let embed = await createEmbed(options);
    msg.channel.send(embed);
}

async function sendShop(msg, user) {
    if(shoppingUsers.includes(msg.author.id)) {
        attemptReply(msg, `You already have the shop menu open!`);
        return;
    }
    shoppingUsers.push(msg.author.id);
    let nextRod = api.fishing.getRodData(user.rod+1);
    let nextLine = api.fishing.getLineData(user.line+1);
    let nextHook = api.fishing.getHookData(user.hook+1);
    let nextAquarium = api.gamedata.getAquariumInfo(user.aquarium_level+1);

    let embedFields = [];
    let itemCount = 1;
    let buyMap = {};
    // SHOP ENTRIES
    // fishing rod entry
    if(nextRod) {
        let canBuy = user.level >= nextRod.level;
        let namePrefix = canBuy ? (user.coins >= nextRod.price ? `:${NumWordMapList[itemCount]}:` : ':credit_card:') : `:lock:`;
        let valueSuffix = canBuy ? '' : ` (unlocks at lvl. ${nextRod.level})`;
        embedFields.push({
            name: `${namePrefix}   Fishing Rod :fishing_pole_and_fish:`,
            value: `${nextRod.name} Rod - ${nextRod.price} coins${valueSuffix}`
        });
        if(canBuy && user.coins >= nextRod.price) {
            buyMap[itemCount.toString()] = 'rod';
            itemCount++;
        }
    }
    // fishing line entry
    if(nextLine) {
        let canBuy = user.level >= nextLine.level;
        let namePrefix = canBuy ? (user.coins >= nextLine.price ? `:${NumWordMapList[itemCount]}:` : ':credit_card:') : `:lock:`;
        let valueSuffix = canBuy ? '' : ` (unlocks at lvl. ${nextLine.level})`;
        embedFields.push({
            name: `${namePrefix}   Fishing Line :thread:`,
            value: `${nextLine.name} Line - ${nextLine.price} coins${valueSuffix}`
        });
        if(canBuy && user.coins >= nextLine.price) {
            buyMap[itemCount.toString()] = 'line';
            itemCount++;
        }
    }
    // hook entry
    if(nextHook) {
        let canBuy = user.level >= nextHook.level;
        let namePrefix = canBuy ? (user.coins >= nextHook.price ? `:${NumWordMapList[itemCount]}:` : ':credit_card:') : `:lock:`;
        let valueSuffix = canBuy ? '' : ` (unlocks at lvl. ${nextHook.level})`;
        embedFields.push({
            name: `${namePrefix}   Hook :hook:`,
            value: `${nextHook.name} Hook - ${nextHook.price} coins${valueSuffix}`
        });
        if(canBuy && user.coins >= nextHook.price) {
            buyMap[itemCount.toString()] = 'hook';
            itemCount++;
        }
    }
    // aquarium entry
    if(nextAquarium) {
        let canBuy = user.level >= nextAquarium.level;
        let namePrefix = canBuy ? (user.coins >= nextAquarium.price ? `:${NumWordMapList[itemCount]}:` : ':credit_card:') : `:lock:`;
        let valueSuffix = canBuy ? '' : ` (unlocks at lvl. ${nextAquarium.level})`;
        embedFields.push({
            name: `${namePrefix}   Aquarium Upgrades :truck:`,
            value: `${capitalizeWords(nextAquarium.name)} Aquarium - ${nextAquarium.price} coins${valueSuffix}`
        });
        if(canBuy && user.coins >= nextAquarium.price) {
            buyMap[itemCount.toString()] = 'aquarium';
            itemCount++;
        }
    }
    // ENTRIES END

    let options = {
        author: [`${msg.author.tag} (Lvl. ${user.level})`, msg.author.displayAvatarURL()],
        title: `Welcome to the shop!`,
        color: api.visuals.getColor('cmd', 'shop'),
        description: `You have ${user.coins} :coin:\n--------------------------------------------------------------------------------`,
        fields: embedFields
    }
    let embed = await createEmbed(options);

    // removes user from array even if there are no message permissions
    setTimeout(function() {
        if(shoppingUsers.indexOf(msg.author.id) !== -1) { shoppingUsers.splice(shoppingUsers.indexOf(msg.author.id), 1); }
    }, 15000);

    msg.channel.send(embed).then(async(sentEmbed) => {
        const filter = ( reaction, user ) => Object.keys(buyMap).includes(reaction.emoji.name[0]) && user.id === msg.author.id;
        const collector = sentEmbed.createReactionCollector(filter, { time: 10000 });
        collector.on('collect', async(reactionData) => {
            collector.stop();
            const selection = buyMap[reactionData.emoji.name[0].toString()];
            // handle buying
            if(selection === 'rod') {
                db.users.buyUpgrade(msg.author.id, 'rod', nextRod.price);
            } else if(selection === 'line') {
                db.users.buyUpgrade(msg.author.id, 'line', nextLine.price);
            } else if(selection === 'hook') {
                db.users.buyUpgrade(msg.author.id, 'hook', nextHook.price);
            } else if(selection === 'aquarium') {
                db.users.buyUpgrade(msg.author.id, 'aquarium_level', nextAquarium.price);
            }
            let options = {
                author: [`${msg.author.tag} (Lvl. ${user.level})`, msg.author.displayAvatarURL()],
                title: `Successfully Purchased Item!   :${NumWordMapList[reactionData.emoji.name[0]]}:`,
                color: api.visuals.getColor('cmd', 'shop')
            };
            let embed = await createEmbed(options);
            msg.channel.send(embed);
        });
        collector.on('end', async() => {
            if(shoppingUsers.indexOf(msg.author.id) !== -1) { shoppingUsers.splice(shoppingUsers.indexOf(msg.author.id), 1); }
            const hasManageMessagesPermissions = msg.channel.type != 'dm' && (await msg.guild.members.fetch(client.user.id)).hasPermission('MANAGE_MESSAGES');
            if(hasManageMessagesPermissions && msg.channel.type != 'dm') { sentEmbed.reactions.removeAll(); }
        });
        for(let i=1; i<itemCount; i++) {
            sentEmbed.react(i.toString() + '\uFE0F\u20E3');
        }
    });
}

async function sendSetLocation(msg, args, user) {
    let locationID = parseInt(args[0] || 1);
    const LocationInfo = api.fishing.getLocationData(locationID);
    if(!locationID || !LocationInfo) {
        attemptReply(msg, `\`${args[0]}\` is not a valid location ID!`);
        return;
    } else if(user.level < LocationInfo.level) {
        attemptReply(msg, `You have not unlocked this location yet!`);
        return;
    } else if(user.location === locationID) {
        attemptReply(msg, `Location ${locationID} (${LocationInfo.name}) is already your current location!`);
        return;
    }

    await db.users.setLocation(msg.author.id, locationID);

    let options = {
        author: [`${msg.author.tag} (Lvl. ${user.level})`, msg.author.displayAvatarURL()],
        title: `Success! You are now at Location ${locationID} - ${LocationInfo.name}`,
        color: api.visuals.getColor('locations', locationID.toString())
    };
    let embed = await createEmbed(options);
    msg.channel.send(embed);
}

async function sendQuest(msg, user) {
    //return // just to block quest functionality for the time being
    if(user.level < 10) {
        attemptReply(msg, `You must reach lvl. 10 before you may access quests!`);
        return;
    }
    if(!user.quest) { // create a quest if user doesn't have a quest
        user.quest = gameLogic.generateQuest(user.level);
        let questString = convertQuestToString(user.quest);
        await db.users.updateQuest(user.userid, questString);
    }
    let questTitle;
    if(user.quest.type === 'catch_tier') {
        questTitle = `Catch ${user.quest.qt} fish of ${user.quest.tier} tier or higher`;
        questProgress = `${user.quest.progress}/${user.quest.qt}`;
    } else if(user.quest.type === 'catch_weight') {
        questTitle = `Catch ${kgToKgString(user.quest.qt)} of fish`;
        questProgress = `${user.quest.progress}/${kgToKgString(user.quest.qt)}`
    } else if(user.quest.type == 'catch_fish') {
        questTitle = `Catch ${user.quest.qt} ${capitalizeWords(user.quest.name.replace(/_/g, ' '))}`;
        questProgress = `${user.quest.progress}/${user.quest.qt}`;
    }

    let options = {
        author: [`${msg.author.tag} (Lvl. ${user.level})`, msg.author.displayAvatarURL()],
        title: `Quest - ${questTitle}`,
        color: api.visuals.getColor('cmd', 'quest'),
        fields: [
            {name: 'Progress', value: questProgress, inline: true},
            {name: 'Reward', value: `${user.quest.reward} :lollipop:`, inline: true},
            {name: 'Quest Age', value: `${millisToDays(Date.now() - user.quest.date)}`, inline: true}
        ]
    };
    if(user.quest.progress === user.quest.qt) { options.description = 'React with :lollipop: to claim your reward' }
    let embed = await createEmbed(options);
    msg.channel.send(embed).then(async (sentEmbed) => {
        if(user.quest && user.quest.progress === user.quest.qt) {
            sentEmbed.react('🍭');
            const filter = ( reaction, user ) => reaction.emoji.name === '🍭' && user.id === msg.author.id;
            const collector = sentEmbed.createReactionCollector(filter, { time: 10000 });
            collector.on('collect', async () => {
                collector.stop();
                user = await db.users.fetchUser(user.userid);
                if(!user.quest || user.quest.progress !== user.quest.qt) {
                    attemptReply(msg, 'You\'ve already collected your reward!');
                    return;
                }
                await db.users.handleQuestCollect(user.userid, user.quest.reward);
                let options = {
                    author: [`${msg.author.tag} (Lvl. ${user.level})`, msg.author.displayAvatarURL()],
                    title: `You claimed your ${user.quest.reward} :lollipop:!`,
                    color: api.visuals.getColor('cmd', 'quest'),
                    description: `Type \`${PREFIX}quest\` to view your next quest.`
                };
                let embed = await createEmbed(options);
                msg.channel.send(embed);
            });
            collector.on('end', async() => {
                const hasManageMessagesPermissions = msg.channel.type != 'dm' && (await msg.guild.members.fetch(client.user.id)).hasPermission('MANAGE_MESSAGES');
                if(hasManageMessagesPermissions) { sentEmbed.reactions.removeAll(); }
            });
        }
    });
}

async function sendBaitShop(msg, user) {
    if (shopProcessing.bait.isProcessing(msg.author.id)) {
        attemptReply(msg, 'Please wait a moment. Your order is processing...');
        return;
    }
    let currentEntry = await db.baitShop.getCurrentEntry();
    
    let embedFields = [];
    let itemCount = 1;
    let buyMap = {};
    for (let i=1; i<=3; i++) {
        const shopItem = {
            option: currentEntry[`option_${i}`],
            price: currentEntry[`price_${i}`],
            qt: currentEntry[`qt_${i}`]
        };
        let namePrefix = user.lollipops >= shopItem.price ? `:${NumWordMapList[itemCount]}:` : ':credit_card:';
        if (user.lollipops >= shopItem.price) {
            buyMap[itemCount.toString()] = i;
            itemCount++;
        }
        embedFields.push({
            name: `${namePrefix} ${capitalizeWords(shopItem.option)} x${shopItem.qt}`,
            value: `Price: ${shopItem.price} :lollipop:`
        });
    }

    let options = {
        author: [`${msg.author.tag} (Lvl. ${user.level})`, msg.author.displayAvatarURL()],
        title: `Welcome to the bait shop!`,
        color: api.visuals.getColor('cmd', 'baitshop'),
        description: `You have ${user.lollipops} :lollipop:\n--------------------------------------------------------------------------------`,
        fields: embedFields,
        footer: `Refreshes in ${millisToTimeString(currentEntry.end_time - Date.now())}`
    };

    let embed = await createEmbed(options);
    msg.channel.send(embed).then(async(sentEmbed) => {
        const filter = ( reaction, user ) => Object.keys(buyMap).includes(reaction.emoji.name[0]) && user.id === msg.author.id;
        const collector = sentEmbed.createReactionCollector(filter, { time: 10000 });
        collector.on('collect', async(reactionData) => {
            collector.stop();
            const choice = buyMap[reactionData.emoji.name[0]];
            const option = currentEntry[`option_${choice}`];
            const price = currentEntry[`price_${choice}`];
            const qt = currentEntry[`qt_${choice}`];
            shopProcessing.bait.setProcessing(msg.author.id);
            user = await db.users.fetchUser(msg.author.id);
            if (price > user.lollipops) {
                attemptReply(msg, 'You cannot afford that anymore!');
                shopProcessing.bait.endProcessing(msg.author.id);
                return;
            }
            await db.users.updateInventory(msg.author.id, option, qt);
            await db.users.updateColumn(msg.author.id, 'lollipops', -price);
            shopProcessing.bait.endProcessing(msg.author.id);

            let options = {
                author: [`${msg.author.tag} (Lvl. ${user.level})`, msg.author.displayAvatarURL()],
                title: `Purchased ${option} x${qt} for ${price}:lollipop:!`,
                color: api.visuals.getColor('cmd', 'baitshop')
            };
            let embed = await createEmbed(options);
            msg.channel.send(embed);
        });
        collector.on('end', async() => {
            const hasManageMessagesPermissions = msg.channel.type != 'dm' && (await msg.guild.members.fetch(client.user.id)).hasPermission('MANAGE_MESSAGES');
            if(hasManageMessagesPermissions && msg.channel.type != 'dm') { sentEmbed.reactions.removeAll(); }
        });
        for(let i=1; i<itemCount; i++) {
            sentEmbed.react(i.toString() + '\uFE0F\u20E3');
        }
    });
}