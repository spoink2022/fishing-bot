const api = require('../../api');
const db = require('../../db');

const { createCanvasForFishingPre, createCanvasForFishingPost, createCanvasForAquarium } = require('../misc/canvas.js');
const { millisToTimeString } = require('../misc/datetime.js');
const { createEmbed } = require('../misc/embed.js');
const { capitalizeWords } = require('../misc/str_functions.js');
const gameLogic = require('../misc/game_logic.js');

const NumWordMapList = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];

let shoppingUsers = [];

module.exports.c = {
    'fish': ['f', 'fis', 'fishy'],
    'aquarium': ['a', 'aq'],
    'shop': [],
    'setlocation': []
};

module.exports.run = async function(msg, cmd, args, user) {
    if(cmd === 'fish') { sendFish(msg, user); }
    else if(cmd === 'aquarium') { sendAquarium(msg, args, user); }
    else if(cmd === 'shop') { sendShop(msg, user); }
    else if(cmd === 'setlocation') { sendSetLocation(msg, args, user); }
}

async function sendFish(msg, user) {
    // check to ensure user is not on cooldown
    let rodCooldown = api.fishing.getRodData(user.rod).cooldown;
    let remainingCooldown = user.cooldown+rodCooldown-Date.now();
    if(remainingCooldown > 0) { // can't fish yet
        msg.channel.send(`Please wait **${millisToTimeString(remainingCooldown)}** to fish again!`);
        return;
    }
    await db.users.resetFishingCooldown(msg.author.id);

    // generate fish, canvas
    let locationInfo = api.fishing.getLocationData(user.location);
    let possibleFishIDs = gameLogic.getPossibleFishIDs(locationInfo.trashChance, locationInfo.fish);
    let possibleFish = gameLogic.getPossibleFish(possibleFishIDs); // takes IDs and returns fish objects
    let res = await createCanvasForFishingPre(user, possibleFish, locationInfo.zoom);
    let canvas = res[0], centerCoords = res[1];
    
    // generate & send embed
    const embedColor = api.visuals.getColor('locations', user.location.toString());
    let options = {
        color: embedColor,
        author: [`${msg.author.tag} (Lvl. ${user.level})`, msg.author.displayAvatarURL()],
        title: `Location ${locationInfo.id} - ${locationInfo.name}`,
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
        let expGained = Math.max(Math.ceil(coinsGained * 2.5), 1);
        // apply coin & exp modifiers
        coinsGained *= hookInfo.multiplier;
        coinsGained = fish.tier === 'f' ? 0 : Math.max(Math.ceil(coinsGained), 2);

        if(lineSnapped) {
            coinsGained = 0;
            expGained = 2;
            descriptionSuffix += ``; // COME BACK AND DO THIS
        }
        const expRequired = api.playerdata.getPlayerLevelInfo(user.level).expRequired;
        await db.users.creditCoinsAndExp(msg.author.id, coinsGained, expGained).then(updatedExp => {
            if(updatedExp >= expRequired) {
                descriptionSuffix += `\nLeveled up to Lvl. ${user.level + 1}! :arrow_up:`;
                db.users.incrementLevel(msg.author.id, expRequired);
            }
            if(api.fishing.getAllLocationData().map(obj => obj.level).includes(user.level + 1)) {
                descriptionSuffix += `\nYou unlocked a new location! :map:`;
            }
        });

        // handle aquarium & stats stuff
        if(fish.tier !== 'f' && !lineSnapped) {
            var oldAquariumEntry = await db.aquarium.getLargestSize(msg.author.id, fishInfo.name);
            if(!oldAquariumEntry || oldAquariumEntry < fish.sizeMult) {
                db.aquarium.setLargestSize(msg.author.id, fishInfo.name, fish.sizeMult);
                descriptionSuffix += `\nPersonal best ${fishInfo.name} catch! Sent to aquarium :truck:`;
            }
            // stats
            db.stats.integrateCatch(msg.author.id, fish.weight);
        }

        // create canvas & embed
        let newCanvasBuffer = await createCanvasForFishingPost(locationInfo.id, canvas, fish, lineSnapped);
        let fishWeightString = fish.weight > 1 ? `${fish.weight}kg` : `${Math.round(fish.weight*1000)}g`;
        let options = {
            color: embedColor,
            author: [`${msg.author.tag} (Lvl. ${user.level})`, msg.author.displayAvatarURL()],
            title: `Caught ${fish.tier === 'f' ? 'trash!' : `a ${fishInfo.name}!`}`,
            description: `Gained ${coinsGained} coins! :coin:\nGained ${expGained} exp! :star:${descriptionSuffix}`,
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
    let locationID = parseInt(args[0] || 1);
    const LocationInfo = api.fishing.getLocationData(locationID);
    if(!locationID || !LocationInfo) {
        msg.reply(`\`${locationID}\` is not a valid location ID!`);
        return;
    } else if(user.level < LocationInfo.level) {
        msg.reply(`You have not unlocked this location yet!`);
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
        collector.on('collect', () => {
            sendCollect(msg, [locationID.toString()], user);
            collector.stop();
        });
        collector.on('end', async() => sentEmbed.reactions.removeAll() );
    });
}

async function sendCollect(msg, args, user) {
    let locationID = parseInt(args[0] || 1);
    const LocationInfo = api.fishing.getLocationData(locationID);
    if(!locationID || !LocationInfo) {
        msg.reply(`\`${locationID}\` is not a valid location ID!`);
        return;
    } else if(user.level < LocationInfo.level) {
        msg.reply(`You have not unlocked this location yet!`);
        return;
    }

    let earnings = await gameLogic.getAquariumEarnings(locationID, user);
    if(earnings < 1) {
        msg.reply('You must have at least 1 coin in an aquarium to collect!');
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

async function sendShop(msg, user) {
    if(shoppingUsers.includes(msg.author.id)) {
        msg.reply('You already have the shop menu open!');
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
            value: `${nextRod.name} Fishing Rod - ${nextRod.price} coins${valueSuffix}`
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
            name: `${namePrefix}   Aquarium :truck:`,
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
        description: `You have ${user.coins} :coin:\n--------------------------------------------------------------------------------`,
        fields: embedFields
    }
    let embed = await createEmbed(options);
    msg.channel.send(embed).then(async(sentEmbed) => {
        const filter = ( reaction, user ) => Object.keys(buyMap).includes(reaction.emoji.name[0]) && user.id === msg.author.id;
        const collector = sentEmbed.createReactionCollector(filter, { time: 20000 });
        collector.on('collect',async(reactionData) => {
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
                let aquariumEarnings = await gameLogic.getAquariumEarnings(user.location, user);
                db.users.integrateAquariumEarnings(msg.author.id, Math.floor(aquariumEarnings));
            }
            let options = {
                author: [`${msg.author.tag} (Lvl. ${user.level})`, msg.author.displayAvatarURL()],
                title: `Successfully Purchased Item!   :${NumWordMapList[reactionData.emoji.name[0]]}:`
            };
            let embed = await createEmbed(options);
            msg.channel.send(embed);
        });
        collector.on('end', async() => {
            if(shoppingUsers.indexOf(msg.author.id) !== -1) { shoppingUsers.splice(shoppingUsers.indexOf(msg.author.id), 1); }
            sentEmbed.reactions.removeAll();
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
        msg.reply(`\`${args[0]}\` is not a valid location ID!`);
        return;
    } else if(user.level < LocationInfo.level) {
        msg.reply(`You have not unlocked this location yet!`);
        return;
    } else if(user.location === locationID) {
        msg.reply(`Location ${locationID} (${LocationInfo.name}) is already your current location!`);
        return;
    }

    await db.users.setLocation(msg.author.id, locationID);

    let options = {
        author: [`${msg.author.tag} (Lvl. ${user.level})`, msg.author.displayAvatarURL()],
        title: `Success! You are now at Location ${locationID} - ${LocationInfo.name}`
    };
    let embed = await createEmbed(options);
    msg.channel.send(embed);
}