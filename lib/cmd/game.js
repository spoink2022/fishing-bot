const api = require('../../api');
const db = require('../../db');
const auth = require('../../static/private/auth.json');

const { createCanvasForFishingPre, createCanvasForFishingPost, createCanvasForAquarium, createCanvasForBounty, createCardCanvas, createCroppedItemShowcaseCanvas } = require('../misc/canvas.js');
const { getEpochDay, getEpochDayFromString, millisToTimeString, millisToDays } = require('../misc/datetime.js');
const { createEmbed } = require('../misc/embed.js');
const { capitalizeWords, convertQuestToString, kgToKgString, kgToWeightString, epochToFormattedString } = require('../misc/str_functions.js');
const gameLogic = require('../misc/game_logic.js');
const adjustToEvent = require('../misc/adjust_to_event.js');
const e = require('express');
const { pushStatsToWebsite } = require('../misc/websocket.js');

const NumWordMapList = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
const WEATHER_ICONS = [':sunny:', ':partly_sunny:', ':cloud:', ':cloud_rain:', ':thunder_cloud_rain:'];
const SIZE_CLASSES = ['small', 'medium', 'large', 'extra large'];
const SIZE_CLASS_ABBREV = ['s', 'm', 'l', 'xl'];
const GRADES = ['consumer', 'premium', 'sashimi', 'trophy'];

function randint(min, max) {
    return min + Math.floor(Math.random()*(max-min+1));
}

async function attemptReply(msg, str) {
    if(msg.channel.type === 'dm') { msg.channel.send(str); }
    else { msg.reply(str); }
}

module.exports.c = {
    'fish': ['f', 'fis', 'fishy'],
    'aquarium': ['a', 'aq'],
    'collect': ['c'],
    'shop': [],
    'setlocation': ['sl'],
    'quest': ['q', 'quests'],
    'baitshop': ['bs'],
    'bounty': [],
    'card': ['cards'],
    'givecard': ['gc'],
    'ring': ['rings'],
    'givering': ['gr']
};

module.exports.run = async function(msg, cmd, args, user) {
    if(cmd === 'fish') { sendFish(msg, args, user); }
    else if(cmd === 'aquarium') { sendAquarium(msg, args, user); }
    else if(cmd === 'collect') { sendCollect(msg, args, user); }
    else if(cmd === 'shop') { sendShop(msg, user); }
    else if(cmd === 'setlocation') { sendSetLocation(msg, args, user); }
    else if(cmd === 'quest') { sendQuest(msg, user); }
    else if(cmd === 'baitshop') { sendBaitShop(msg, user); }
    else if(cmd === 'bounty') { sendBounty(msg, user); }
    else if (cmd === 'card') { sendCard(msg, args, user); }
    else if (cmd === 'givecard') { sendGiveCard(msg, args, user); }
    else if (cmd === 'ring') { sendRing(msg, args, user); }
    else if (cmd === 'givering') { sendGiveRing(msg, args, user); }
}

async function sendFish(msg, args, user) {
    const currentEvent = await db.events.getCurrentEvent();
    const rodInfo = api.fishing.getRodData(user.rod);
    let clanMember = await db.clan.fetchMember(msg.author.id);
    let clan = clanMember ? await db.clan.fetchClan(clanMember.clan) : null;
    let pInfo = await db.users.getPurchases(msg.author.id);
    let perks = gameLogic.getClanPerks(clan);
    // check to ensure user is not on cooldown
    let rodCooldown = rodInfo.cooldown;
    rodCooldown = adjustToEvent('rodCooldown', rodCooldown, currentEvent);
    rodCooldown *=  (100 - perks.fish_cd)/100; // CLAN PERKS
    let remainingCooldown = user.cooldown+rodCooldown-Date.now();
    if (remainingCooldown > 0) { // can't fish yet
        msg.channel.send(`Please wait **${millisToTimeString(remainingCooldown)}** to fish again!`);
        return;
    }
    // handle bait stuff
    let minTier = 'D';
    let sizeClasses = [1, 2, 3, 4];
    let boostedFamilies = [];
    let baitUsed = false;
    let baitName;
    if (args[0]) {
        baitName = args.map(str => str.toLowerCase()).join(' ');
        const baitNames = api.gamedata.getAllBaitNames();
        if (!baitNames.includes(baitName)) {
            attemptReply(msg, `\`${baitName}\` is not a valid bait!`);
            return;
        }
        const userInventory = await db.users.fetchInventory(msg.author.id);
        if (userInventory[baitName] === 0) {
            attemptReply(msg, `You don't have any ${baitName}!`);
            return;
        }
        baitUsed = true;
        const baitInfo = api.gamedata.getBaitData(baitName);
        minTier = baitInfo.tier;
        sizeClasses = baitInfo.sizes;
        boostedFamilies = baitInfo.families;
        db.users.updateInventory(msg.author.id, baitName, -1);
    }

    let cooldownChargeback = 0;
    if (pInfo && pInfo.one_week_host) {
        // credit waited time
        cooldownChargeback = Math.min(-remainingCooldown, rodCooldown);
    }
    await db.users.resetFishingCooldown(msg.author.id, cooldownChargeback);

    // glove bonus
    const gloveInfo = api.fishing.getGloveData(user.glove);
    const gloveBonus = user.glove !== 0 && randint(1, 100) <= gloveInfo.chance ? gloveInfo.bonus : 0;
    // generate fish, canvas
    let locationInfo = api.fishing.getLocationData(user.location);
    let weatherNum = (await db.misc.daily.getCurrentEntry())[`weather_${user.location}`];
    // if bait used, no trash (ie id !== 0)
    let possibleFishIDs = gameLogic.getPossibleFishIDs(locationInfo.trashChance, locationInfo.fish, sizeClasses, boostedFamilies, baitUsed, weatherNum);
    let possibleFish = gameLogic.getPossibleFish(possibleFishIDs, minTier, weatherNum); // takes IDs and returns fish objects
    let res = await createCanvasForFishingPre(user, possibleFish, locationInfo.zoom, rodInfo.size, baitUsed ? baitName : false, weatherNum);
    let canvas = res[0], centerCoords = res[1];
    // generate & send embed
    const embedColor = api.visuals.getColor('locations', user.location.toString());
    let options = {
        color: embedColor,
        author: [`${msg.author.tag} (Lvl. ${user.level})`, msg.author.displayAvatarURL()],
        title: `Location ${locationInfo.id} - ${locationInfo.name} ${WEATHER_ICONS[weatherNum]}`,
        description: `${baitUsed ? `Used bait: \`${baitName}\`\n` : ''}${gloveBonus !== 0 ? `Good cast! (+${gloveInfo.bonus}kg) :gloves:\n` : ''}`,
        attachment: { name: 'fishing.png', content: await canvas.toBuffer() }
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
        const swivelBonus = user.swivel !== 0 && fishInfo.family === 'shark' ? api.fishing.getSwivelData(user.swivel).bonus : 0;
        const lineSnapped = fish.weight > (Math.min(lineInfo.maxWeight, hookInfo.maxWeight, rodInfo.maxWeight) + gloveBonus + swivelBonus) * (1 + perks.max_weight/100);
        // ^ CLAN PERKS - MAX WEIGHT
        let coinsGained = fish.tier === 'f' ? 0 : fish.weight * fishInfo.value;
        let expGained = Math.max(Math.ceil(Math.sqrt(coinsGained * 10)), 1) + lineInfo.bonus;
        let bonusExp = Math.ceil(expGained * perks.exp_bonus / 100); // CLAN PERKS - EXP
        // apply coin & exp modifiers
        coinsGained *= hookInfo.multiplier;
        coinsGained = fish.tier === 'f' ? 0 : Math.max(Math.ceil(coinsGained), 2);
        let bonusCoins = Math.ceil(coinsGained * perks.coin_bonus / 100) // CLAN PERKS - COIN

        if (lineSnapped) {
            coinsGained = 0;
            bonusCoins = 0;
            expGained = 2;
            bonusExp = 0;
        }
        
        descriptionSuffix += `Gained ${coinsGained} coins! :coin:`
        if (bonusCoins) { descriptionSuffix += `\nGained ${bonusCoins} bonus coin${bonusCoins === 1 ? '' : 's'}! :coin:`; }
        descriptionSuffix += `\nGained ${expGained} exp! :star:`
        if (bonusExp) { descriptionSuffix += `\nGained ${bonusExp} bonus exp! :star:` }

        let expRequired = api.leveldata.getPlayerLevelInfo(user.level).expRequired;
        await db.users.creditCoinsAndExp(msg.author.id, coinsGained + bonusCoins, expGained + bonusExp).then(updatedExp => {
            while(updatedExp >= expRequired) {
                descriptionSuffix += `\nLeveled up to Lvl. ${user.level + 1}! :arrow_up:`;
                db.users.incrementLevel(msg.author.id, expRequired);
                updatedExp -= expRequired;
                expRequired = api.leveldata.getPlayerLevelInfo(user.level + 1).expRequired;
                user.level++;
                if (user.level === 10) {
                    descriptionSuffix += '\nCheck out what\'s new with `.help 3`';
                } else if (user.level === 20) {
                    descriptionSuffix += '\nCheck out what\'s new with `.help 4`';
                }
                if(api.fishing.getAllLocationData().map(obj => obj.level).includes(user.level)) {
                    descriptionSuffix += `\nYou unlocked a new location! :map:`;
                }
            }
        });

        // handle aquarium, stats, bounty, and quest stuff
        if(fish.tier !== 'f' && !lineSnapped) {
            // aquarium
            var oldAquariumEntry = await db.aquarium.getLargestSize(msg.author.id, fishInfo.name);
            if(!oldAquariumEntry || oldAquariumEntry < fish.sizeMult) {
                db.aquarium.setLargestSize(msg.author.id, fishInfo.name, fish.sizeMult);
                descriptionSuffix += `\nPersonal best ${fishInfo.name} catch! Sent to aquarium :truck:`;
            }
            // stats
            db.stats.integrateCatch(msg.author.id, fish.weight);
            if (msg.channel.type == 'text') { db.stats.integrateCatchServer(msg.guild.id, fish.weight); }
            pushStatsToWebsite(fish.weight/1000);
            // clan
            let clanMember = await db.clan.fetchMember(msg.author.id);
            if (clanMember) {
                db.clan.incrementCaught(clanMember.clan);
                descriptionSuffix += '\n+1 clan catch! :fish:';
                // clan campaign
                // see if user is fit to credit to campaign
                let epochDay = getEpochDay();
                let joinEpochDay = getEpochDayFromString(clanMember.date);
                if (epochDay !== joinEpochDay && epochDay !== clanMember.last_campaign_catch) {
                    let clan = await db.clan.fetchClan(clanMember.clan);
                    let campaignInfo = api.gamedata.getCampaignData(clan.campaign_stage);
                    if (campaignInfo && campaignInfo.requirements.map(entry => entry[0]).includes(fish.id)) {
                        // caught a fish required in campaign
                        let campaignFishCaught = 0;
                        let campaignFishRequired = campaignInfo.requirements.filter((entry) => entry[0] === fish.id)[0][1];
                        for (let campaignFish of clan.campaign_progress) {
                            if (campaignFish === fish.id) { campaignFishCaught++; }
                        }
                        if (campaignFishCaught < campaignFishRequired) {
                            // implement progress on campaign
                            await db.clan.setClanMemberColumn(msg.author.id, 'last_campaign_catch', epochDay);
                            db.clan.creditMemberWithCampaignCatch(msg.author.id);
                            db.clan.addCampaignCatch(clan.id, fish.id);
                            descriptionSuffix += `\n+1 campaign catch! :golf:`;
                        }
                    }
                }
            }
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
            // cards
            if (user.equipped_ring) {
                let ring = await db.misc.rings.getRingData(user.equipped_ring);
                let ringInfo = api.fishing.getRingData(ring.ring_type);
                let dropChance = ring[SIZE_CLASS_ABBREV[fishInfo.sizeClass-1]] + ringInfo.classBoost[fishInfo.sizeClass-1];
                if (Math.random()*100 <= dropChance) {
                    let entryCount = await db.misc.cards.getEntryCount(user.userid);
                    if (entryCount >= 10) {
                        descriptionSuffix += `\nThe fish dropped a card but your card box was full :x:`;
                    } else {
                        const gradeRoll = randint(1, 100);
                        let grade = gradeRoll <= ring.trophy ? 1 : gradeRoll <= ring.trophy+ring.sashimi ? 2 : gradeRoll <= ring.trophy+ring.sashimi+ring.premium ? 3 : 4;
                        if (grade !== 1 && ringInfo.gradeBoost[4-grade] !== 0) {
                            if (randint(1, 100) <= ringInfo.gradeBoost[4-grade]) {
                                grade--;
                            }
                        }
                        const cardObj = { userid: msg.author.id, fish: fish.id, r: fish.sizeMult, grade: grade};
                        let cardID = await db.misc.cards.insertEntry(cardObj);
                        descriptionSuffix += `\nYou got a fish card! *View it with* \`.card ${cardID}\` :card_index:`;
                    }
                }
            }
            // bounties
            if (user.level >= 10) {
                let bounty = await db.misc.bounty.getCurrentEntry();
                if (bounty.id !== user.bounty && fishInfo.name === bounty.fish && TIER_RANKS[fish.tier] >= TIER_RANKS[bounty.tier.toLowerCase()]) {
                    db.users.claimBounty(user.userid, bounty.id, bounty.reward);
                    db.misc.bounty.incrementCompleted(bounty.id);
                    descriptionSuffix += `\n\n**Bounty Complete!**\nYou claimed ${bounty.reward} :lollipop:`;
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
            description: `${baitUsed ? `Used bait: \`${baitName}\`\n` : ''}${gloveBonus !== 0 ? `Good cast! (+${gloveInfo.bonus}kg) :gloves:\n` : ''}${descriptionSuffix}`,
            fields: fish.tier === 'f' || lineSnapped ? [] : [{ name: 'Weight :scales:', value: fishWeightString, inline: true }],
            attachment: { name: 'catch.png', content: newCanvasBuffer }
        };
        if(lineSnapped) { 
            options.title = `Oh no, your line snapped on a ${fishWeightString} ${fishInfo.name}!`; 
            options.description = `The fish got away!\n` + options.description;
            options.footer = `Use "${PREFIX}equipment" to view your equipment`;
        }
        let embed = await createEmbed(options);
        sentEmbed.react('\ud83e\ude9d').then(async() => {
            const filter = ( reaction, user ) => reaction.emoji.name === '\ud83e\ude9d' && user.id === msg.author.id;
            const collector = await sentEmbed.createReactionCollector(filter, { time: 10000 });
            collector.on('collect', () => collector.stop());
            collector.on('end', async() => {
                msg.channel.send(embed);
                await sentEmbed.delete().catch(() => {
                    console.log('game.js deleting embed end of game function is the error');
                });
            });
        }).catch(async() => {
            setTimeout(async function() {
                console.log('Couldn\'t react to .fish, overriding timeout...');
                msg.channel.send(embed);
                await sentEmbed.delete().catch(() => {
                    console.log('game.js deleting embed end of game function is the error (in override)');
                });
            }, 5000);
        });
    });
}

async function sendAquarium(msg, args, user) {
    let mentionedUser = await msg.mentions.users.first();
    if (mentionedUser) { args.splice(-1, 1); } // removes last element in args (the <@userid>)
    if (mentionedUser && msg.author.id !== mentionedUser.id) {
        if (mentionedUser.bot) {
            attemptReply(msg, 'bots can\'t be fishers!');
            return;
        }
        user = await db.users.fetchUser(mentionedUser.id);
        if (!user) {
            attemptReply(msg, `${mentionedUser.username} doesn't have an account yet! Go get them to type \`.start\``);
            return;
        } else if (!user.opted_in) {
            attemptReply(msg, `${mentionedUser.username} is not opted in! Get them to type \`.optin\``);
            return;
        }
    }

    let locationID = parseInt(args[0] || user.location);
    const LocationInfo = api.fishing.getLocationData(locationID);
    if(!locationID || !LocationInfo) {
        attemptReply(msg, `\`${args[0]}\` is not a valid location ID!`);
        return;
    } else if(user.level < LocationInfo.level) {
        if (mentionedUser) {
            attemptReply(msg, `${mentionedUser.username} has not unlocked this location yet!`);
        } else {
            attemptReply(msg, 'you have not unlocked this location yet!');
        }
        return;
    }
    const embedColor = api.visuals.getColor('locations', locationID.toString());
    const AquariumInfo = api.gamedata.getAquariumInfo(user.aquarium_level);

    let clanMember = await db.clan.fetchMember(user.userid);
    let clan = clanMember ? await db.clan.fetchClan(clanMember.clan) : null;
    let perks = gameLogic.getClanPerks(clan);
    let aquariumCapacity = Math.floor(AquariumInfo.max * (1 + perks.aquarium_capacity/100)); // CLAN PERKS - AQ CAPACITY

    let earnings = await gameLogic.getAquariumEarnings(locationID, user, aquariumCapacity);
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
    let author = mentionedUser || msg.author;
    let options = {
        color: embedColor,
        author: [`${author.tag} (Lvl. ${user.level})`, author.displayAvatarURL()],
        title: `Aquarium - ${LocationInfo.name} (${Math.round(earnRate*10)/10}/hr)`,
        description: `Coins Earned: ${Math.floor(earnings)}/${aquariumCapacity} :coin:`,
        fields: { name: `${fishFound}/${totalFish} Fish Found`, value: embedFieldVal },
        attachment: { name: 'aquarium.png', content: canvasBuffer }
    }
    let embed = await createEmbed(options);

    msg.channel.send(embed).then(async (sentEmbed) => {
        if (!mentionedUser || mentionedUser.id === msg.author.id) {
            sentEmbed.react('\ud83e\ude99').catch(() => attemptReply(msg, 'Please make sure Big Tuna has permissions to react to messages!'));
            const filter = ( reaction, user ) => reaction.emoji.name === '\ud83e\ude99' && user.id === msg.author.id;
            const collector = sentEmbed.createReactionCollector(filter, { time: 10000 });
            collector.on('collect', async () => {
                user = await db.users.fetchUser(user.userid); // refetch values
                sendCollect(msg, [locationID.toString()], user);
                collector.stop();
            });
            collector.on('end', async() => {
                const hasManageMessagesPermissions = msg.channel.type === "text" && (await msg.guild.members.fetch(client.user.id)).hasPermission('MANAGE_MESSAGES');
                if(hasManageMessagesPermissions) {
                    sentEmbed.reactions.removeAll().catch(() => {
                        console.log('Couldn\'t remove AQUARIUM reactions');
                    });
                }
            });
        }
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
    const AquariumInfo = api.gamedata.getAquariumInfo(user.aquarium_level);

    let clanMember = await db.clan.fetchMember(msg.author.id);
    let clan = clanMember ? await db.clan.fetchClan(clanMember.clan) : null;
    let perks = gameLogic.getClanPerks(clan);

    let aquariumCapacity = Math.floor(AquariumInfo.max * (1 + perks.aquarium_capacity/100)); // CLAN PERKS - AQ CAPACITY

    let earnings = await gameLogic.getAquariumEarnings(locationID, user, aquariumCapacity);
    if(earnings < 1) {
        attemptReply(msg, `You must have at least 1 coin in an aquarium to collect!`);
        return;
    }

    earnings = Math.floor(earnings);
    const embedColor = api.visuals.getColor('locations', locationID.toString());
    let options = {
        color: embedColor,
        author: [`${msg.author.tag} (Lvl. ${user.level})`, msg.author.displayAvatarURL()],
        title: `You collected ${earnings} coin${earnings > 1 ? 's' : ''}! :coin:`,
        description: `You now have ${user.coins + earnings} coin${user.coins + earnings > 1 ? 's' : ''}!`
    };
    db.users.collectAquariumEarnings(msg.author.id, earnings, locationID);
    let embed = await createEmbed(options);
    msg.channel.send(embed);
}

async function sendCollectAll(msg, user) {
    let unlockedLocations = api.fishing.getUnlockedLocations(user.level);

    const AquariumInfo = api.gamedata.getAquariumInfo(user.aquarium_level);

    let clanMember = await db.clan.fetchMember(msg.author.id);
    let clan = clanMember ? await db.clan.fetchClan(clanMember.clan) : null;
    let perks = gameLogic.getClanPerks(clan);

    let aquariumCapacity = Math.floor(AquariumInfo.max * (1 + perks.aquarium_capacity/100)); // CLAN PERKS - AQ CAPACITY

    let totalEarnings = 0;
    for(const locationID of unlockedLocations) {
        totalEarnings += await gameLogic.getAquariumEarnings(locationID, user, aquariumCapacity);
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
        title: `You collected a total of ${totalEarnings} coin${totalEarnings > 1 ? 's' : ''}!`,
        description: `You now have ${user.coins + totalEarnings} coin${user.coins + totalEarnings > 1 ? 's' : ''}!`
    }
    let embed = await createEmbed(options);
    msg.channel.send(embed);
}

async function sendShop(msg, user) {
    let nextRod = api.fishing.getRodData(user.rod+1);
    let nextLine = api.fishing.getLineData(user.line+1);
    let nextHook = api.fishing.getHookData(user.hook+1);
    let nextGlove = user.level >= 20 ? api.fishing.getGloveData(user.glove+1) : false;
    let nextSwivel = user.level >= 50 ? api.fishing.getSwivelData(user.swivel+1) : false;
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
    // glove entry
    if (nextGlove) {
        let canBuy = user.level >= nextGlove.level;
        let namePrefix = canBuy ? (user.coins >= nextGlove.price ? `:${NumWordMapList[itemCount]}:` : ':credit_card:') : ':lock:';
        let valueSuffix = canBuy ? '' : ` (unlocks at lvl. ${nextGlove.level})`;
        embedFields.push({
            name: `${namePrefix}   Glove :gloves:`,
            value: `${nextGlove.name} Glove - ${nextGlove.price} coins${valueSuffix}`
        });
        if (canBuy && user.coins >= nextGlove.price) {
            buyMap[itemCount.toString()] = 'glove';
            itemCount++;
        }
    }
    // swivel entry
    if (nextSwivel) {
        let canBuy = user.level >= nextSwivel.level;
        let namePrefix = canBuy ? (user.coins >= nextSwivel.price ? `:${NumWordMapList[itemCount]}:` : ':credit_card:') : ':lock:';
        let valueSuffix = canBuy ? '' : ` (unlocks at lvl. ${nextSwivel.level})`;
        embedFields.push({
            name: `${namePrefix}   Swivel :safety_pin:`,
            value: `${nextSwivel.name} Swivel - ${nextSwivel.price} coins${valueSuffix}`
        });
        if (canBuy && user.coins >= nextSwivel.price) {
            buyMap[itemCount.toString()] = 'swivel';
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
    // ring entry x2
    if (user.level >= 20) {
        var packInfo = api.fishing.getPackInfo(user.level);
        // regular pack
        let namePrefix = user.coins >= packInfo.regular.price ? `:${NumWordMapList[itemCount]}:` : ':credit_card:';
        embedFields.push({
            name: `${namePrefix}   **Regular Ring Pack** :ring:`,
            value: `1 Random Ring - ${packInfo.regular.price} coins`
        });
        if (user.coins >= packInfo.regular.price) {
            buyMap[itemCount.toString()] = 'regular_ring';
            itemCount++;
        }
        // premium pack
        namePrefix = user.coins >= packInfo.premium.price ? `:${NumWordMapList[itemCount]}:` : ':credit_card:';
        embedFields.push({
            name: `${namePrefix}   **Premium Ring Pack** :ring:`,
            value: `1 Random Ring (better stats, chance for premium type) - ${packInfo.premium.price} coins`
        });
        if (user.coins >= packInfo.premium.price) {
            buyMap[itemCount.toString()] = 'premium_ring';
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

    msg.channel.send(embed).then(async(sentEmbed) => {
        const filter = ( reaction, user ) => Object.keys(buyMap).includes(reaction.emoji.name[0]) && user.id === msg.author.id;
        const collector = sentEmbed.createReactionCollector(filter, { time: 20000 });
        collector.on('collect', async(reactionData) => {
            collector.stop();
            const selection = buyMap[reactionData.emoji.name[0].toString()];
            // handle buying
            if(selection === 'rod') {
                var purchase = { item: 'rod', price: nextRod.price };
            } else if(selection === 'line') {
                var purchase = { item: 'line', price: nextLine.price };
            } else if(selection === 'hook') {
                var purchase = { item: 'hook', price: nextHook.price };
            } else if (selection === 'glove') {
                var purchase = { item: 'glove', price: nextGlove.price };
            } else if (selection === 'swivel') {
                var purchase = { item: 'swivel', price: nextSwivel.price };
            } else if(selection === 'aquarium') {
                var purchase = { item: 'aquarium_level', price: nextAquarium.price };
            } else if (selection === 'regular_ring') {
                unpackRing(msg, user, 'regular', packInfo);
                return;
            } else if (selection === 'premium_ring') {
                unpackRing(msg, user, 'premium', packInfo);
                return;
            }
            let currentUser = await db.users.fetchUser(msg.author.id);
            if (currentUser.coins < purchase.price) {
                attemptReply(msg, 'You cannot afford that anymore!');
                return;
            } 
            else if (currentUser[purchase.item] !== user[purchase.item]) {
                attemptReply(msg, 'You have already bought that item!');
                return;
            }
            db.users.buyUpgrade(msg.author.id, purchase.item, purchase.price);
            let options = {
                author: [`${msg.author.tag} (Lvl. ${user.level})`, msg.author.displayAvatarURL()],
                title: `Successfully Purchased Item!   :${NumWordMapList[reactionData.emoji.name[0]]}:`,
                color: api.visuals.getColor('cmd', 'shop')
            };
            let embed = await createEmbed(options);
            msg.channel.send(embed);
        });
        collector.on('end', async() => {
            sentEmbed.reactions.removeAll().catch(() => {
                console.log('Couldn\'t remove SHOP reactions');
            });
        });
        for(let i=1; i<itemCount; i++) {
            sentEmbed.react(i.toString() + '\uFE0F\u20E3');
        }
    });
}
async function unpackRing(msg, user, packType, packInfo) {
    let currentUser = await db.users.fetchUser(user.userid);
    if (currentUser.coins < packInfo[packType].price) {
        attemptReply(msg, 'You cannot afford that anymore!');
        return;
    } 
    let rings = await db.misc.rings.getAllEntries(user.userid);
    if (rings.length >= 10) {
        attemptReply(msg, 'You already have 10 rings! Sell one of them to purchase more!');
        return;
    }
    db.users.updateColumn(user.userid, 'coins', -(packInfo[packType].price));
    let ring = gameLogic.generateRing(packType, packInfo);
    ring.userid = user.userid;
    let ringID = await db.misc.rings.insertEntry(ring);
    if (rings.length === 0) {
        db.users.setColumn(user.userid, 'equipped_ring', ringID);
    }
    let options = {
        author: [`${msg.author.tag} (Lvl. ${user.level})`, msg.author.displayAvatarURL()],
        title: `Successfully Purchashed ${capitalizeWords(packType)} Ring Pack!`,
        color: api.visuals.getColor('cmd', 'shop'),
        description: `Check out your new ring with \`.ring ${ringID}\`!`
    };
    let embed = await createEmbed(options);
    msg.channel.send(embed);
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
    if(user.level < 10) {
        attemptReply(msg, `You must reach lvl. 10 before you may access quests!`);
        return;
    }

    let clanMember = await db.clan.fetchMember(msg.author.id);
    let clan = clanMember ? await db.clan.fetchClan(clanMember.clan) : null;
    let perks = gameLogic.getClanPerks(clan);

    if(!user.quest) { // create a quest if user doesn't have a quest
        user.quest = gameLogic.generateQuest(user.level, perks.quest_mba);
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

    let questCooldown = 1000*60*60*24*3;
    questCooldown *= (100 - perks.quest_cd)/100; // CLAN PERKS - QUEST CD

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
    if (user.quest.progress === user.quest.qt) {
        options.description = 'React with :lollipop: to claim your reward';
    } else if (Date.now() - user.quest.date >= questCooldown) { // allow reset
        options.description = 'React with :arrows_counterclockwise: to reset your quest.';
    } else {
        options.description = `You will be able to reset your quest when it is ${perks.quest_cd ? '2 days' : '3 days'} old.`;
    }
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
                let newQuest = gameLogic.generateQuest(user.level, perks.quest_mba);
                let questString = convertQuestToString(newQuest);
                await db.users.updateQuest(user.userid, questString);

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
                if(hasManageMessagesPermissions) {
                    sentEmbed.reactions.removeAll().catch(() => {
                        console.log('Couldn\'t remove QUEST reactions');
                    });
                }
            });
        } else if (user.quest && Date.now() - user.quest.date >= questCooldown) { // can reset
            let sentReaction = await sentEmbed.react('🔄');
            const filter = ( reaction, user ) => reaction.emoji.name === '🔄' && user.id === msg.author.id;
            const collector = sentEmbed.createReactionCollector(filter, { time: 20000 });
            collector.on('collect', async () => {
                collector.stop();
                user = await db.users.fetchUser(user.userid);
                if(!user.quest || !Math.floor((Date.now() - user.quest.date)/(1000*60*60*24)) >= 3) {
                    attemptReply(msg, 'You\'ve already reset your quest!');
                    return;
                }
                await db.users.deleteQuest(user.userid);
                let options = {
                    author: [`${msg.author.tag} (Lvl. ${user.level})`, msg.author.displayAvatarURL()],
                    title: `You successfully reset your quest!`,
                    color: api.visuals.getColor('cmd', 'quest'),
                    description: `Type \`${PREFIX}quest\` to view your next quest.`
                };
                let embed = await createEmbed(options);
                msg.channel.send(embed);
            });
            collector.on('end', async() => {
                const hasManageMessagesPermissions = msg.channel.type != 'dm' && (await msg.guild.members.fetch(client.user.id)).hasPermission('MANAGE_MESSAGES');
                if(hasManageMessagesPermissions) {
                    sentEmbed.reactions.removeAll().catch(() => {
                        console.log('Couldn\'t remove QUEST RESET reactions');
                    });
                }
            });
        }
    });
}

async function sendBaitShop(msg, user) {
    let currentEntry = await db.misc.baitshop.getCurrentEntry();
    
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
            user = await db.users.fetchUser(msg.author.id);
            if (price > user.lollipops) {
                attemptReply(msg, 'You cannot afford that anymore!');
                return;
            }
            await db.users.updateInventory(msg.author.id, option, qt);
            await db.users.updateColumn(msg.author.id, 'lollipops', -price);

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
            if(hasManageMessagesPermissions && msg.channel.type != 'dm') {
                sentEmbed.reactions.removeAll().catch(() => {
                    console.log('Couldn\'t remove BAITSHOP reactions');
                });
            }
        });
        for(let i=1; i<itemCount; i++) {
            sentEmbed.react(i.toString() + '\uFE0F\u20E3');
        }
    }).catch(() => {
        console.log('There was an error with the bait shop');
    });
}

async function sendBounty(msg, user) {
    if(user.level < 10) {
        attemptReply(msg, `You must reach lvl. 10 before you may access bounties!`);
        return;
    }
    let currentEntry = await db.misc.bounty.getCurrentEntry();

    let bountyComplete = user.bounty === currentEntry.id;

    let fishID = api.fishing.getFishNames().indexOf(currentEntry.fish);
    let fishInfo = api.fishing.getFishData(fishID);
    let canvasBuffer = await createCanvasForBounty(currentEntry, fishInfo, bountyComplete);

    let options = {
        author: [`${msg.author.tag} (Lvl. ${user.level})`, msg.author.displayAvatarURL()],
        title: `Bounty - ${epochToFormattedString(currentEntry.start_time)} ${bountyComplete ? '(Complete)' : ''}`,
        color: api.visuals.getColor('cmd', bountyComplete ? 'bountyComplete' : 'bounty'),
        description: `*Players completed: ${currentEntry.completed}*\n\u200b`,
        fields: [
            {name: 'Species', value: capitalizeWords(currentEntry.fish), inline: true},
            {name: 'Requirements', value: `${currentEntry.tier}-Tier (or higher)`, inline: true},
            {name: 'Reward', value: `${currentEntry.reward} :lollipop:`, inline: true}
        ],
        attachment: { name: 'wanted.png', content: canvasBuffer },
        footer: `New bounty in ${millisToTimeString(currentEntry.end_time - Date.now())}`
    };
    
    let embed = await createEmbed(options);
    msg.channel.send(embed);
}

async function sendCard(msg, args, user) {
    if (user.level < 20) {
        attemptReply(msg, 'You must reach lvl. 20 before you may access cards!');
        return;
    }
    if (!args[0]) { // view all cards
        sendAllCards(msg, user);
        return;
    }
    if (!parseInt(args[0]) || parseInt(args[0]) <= 0) { // didnt give a valid number
        attemptReply(msg, `\`${args[0]}\` is not a valid card ID`);
        return;
    }
    args[0] = parseInt(args[0]);
    let card = await db.misc.cards.getCardData(args[0]);
    if (!card) {
        attemptReply(msg, `There is no card with an ID of \`${args[0]}\``);
        return;
    } else if (card.userid !== user.userid) {
        attemptReply(msg, 'That card does not belong to you!');
        return;
    }
    // card is real
    const fishInfo = api.fishing.getFishData(card.fish);
    // recommended value is rounded
    // market value is recommended value (unrounded) * market prices
    let fishWeight = Math.round((fishInfo.sizeMin + (fishInfo.sizeMax-fishInfo.sizeMin)*card.r) * 1000) / 1000;
    let cardValue = Math.round(gameLogic.getCardValue(card, card.grade)); // parameter incorporates grade

    let canvasBuffer = await createCardCanvas(card, GRADES[4-card.grade]);

    let embedDescription = [
        `:sparkles: Meat Quality: **${capitalizeWords(GRADES[4-card.grade])} Grade** *(#${card.grade})*`,
        `:fish: Species: **${capitalizeWords(fishInfo.name)}**`,
        `:mag: Class: **${capitalizeWords(SIZE_CLASSES[fishInfo.sizeClass-1])}**`,
        `:scales: Weight: **${kgToWeightString(fishWeight)} (${gameLogic.getTier(card.r).toUpperCase()})**`,
        `:moneybag: Sell Price: **${cardValue}** :lollipop:`
    ].join('\n');
    let options = {
        title: `Card - ${card.id}`,
        author: [`${msg.author.tag} (Lvl. ${user.level})`, msg.author.displayAvatarURL()],
        color: api.visuals.getColor('card', GRADES[4-card.grade]),
        description: embedDescription,
        attachment: { name: 'card.png', content: canvasBuffer }
    }
    let embed = await createEmbed(options);
    msg.channel.send(embed).then(async(sentEmbed) => {
        let currentRecord = await db.aquarium.getLargestSize(user.userid, fishInfo.name);
        let unlockedLocations = api.fishing.getUnlockedLocations(user.level);
        let newRecord = (!currentRecord || currentRecord < card.r) && unlockedLocations.includes(fishInfo.location);
        const filter = ( reaction, user ) => (reaction.emoji.name === '💰' || (reaction.emoji.name === '🚚' && newRecord)) && user.id === msg.author.id;
        const collector = sentEmbed.createReactionCollector(filter, { time: 20000 });
        collector.on('collect', async(reactionData) => {
            collector.stop();
            card = await db.misc.cards.getCardData(args[0]);
            if (!card) {
                attemptReply(msg, 'You no longer have that card!');
            } else if (reactionData.emoji.name === '💰') {
                db.users.updateColumn(user.userid, 'lollipops', cardValue);
                db.misc.cards.removeEntry(card.id);
                let options = {
                    author: [`${msg.author.tag} (Lvl. ${user.level})`, msg.author.displayAvatarURL()],
                    title: `Success!`,
                    color: api.visuals.getColor('classic', 'success'),
                    description: `You sold your fish card and got ${cardValue} :lollipop:`
                };
                let embed = await createEmbed(options);
                msg.channel.send(embed);
            } else if (reactionData.emoji.name === '🚚' && newRecord) {
                db.misc.cards.removeEntry(card.id);
                db.aquarium.setLargestSize(user.userid, fishInfo.name, card.r);
                let options = {
                    author: [`${msg.author.tag} (Lvl. ${user.level})`, msg.author.displayAvatarURL()],
                    title: `Success!`,
                    color: api.visuals.getColor('classic', 'success'),
                    description: `You transferred your fish card to your aquarium!`
                };
                let embed = await createEmbed(options);
                msg.channel.send(embed);
            }
        });
        collector.on('end', async() => {
            const hasManageMessagesPermissions = msg.channel.type != 'dm' && (await msg.guild.members.fetch(client.user.id)).hasPermission('MANAGE_MESSAGES');
            if(hasManageMessagesPermissions && msg.channel.type != 'dm') {
                sentEmbed.reactions.removeAll().catch(() => {
                    console.log('Couldn\'t remove CARD reactions');
                });
            }
        });
        sentEmbed.react('💰');
        if (newRecord) {
            sentEmbed.react('🚚');
        }
    });
}

async function sendAllCards(msg, user) {
    const allCards = await db.misc.cards.getAllEntries(user.userid);
    const fishNames = api.fishing.getFishNames();
    const GRADE_EMOJIS = [':trophy:', ':sushi:', ':fried_shrimp:', ':rock:'];

    const pInfo = await db.users.getPurchases(user.userid); // "pInfo"

    let embedDescription = [];

    for (let card of allCards) {
        embedDescription.push(`\`${card.id}\` - ${GRADE_EMOJIS[card.grade-1]} **${capitalizeWords(fishNames[card.fish])}** (${gameLogic.getTier(card.r).toUpperCase()})`);
    }

    let options = {
        author: [`${msg.author.tag} (Lvl. ${user.level})`, msg.author.displayAvatarURL()],
        title: `Fish Cards (${allCards.length}/10)`,
        color: api.visuals.getNestedColor('cmd', 'cards', pInfo && pInfo.one_week_host > 0 ? 'oneWeekHost' : 'default'),
        description: embedDescription.join('\n') || '*You don\'t have any fish cards*',
        footer: 'To see a specific card, use .card <id>'
    };
    let embed = await createEmbed(options);
    msg.channel.send(embed);
}

async function sendGiveCard(msg, args, user) {
    if (user.level < 20) {
        attemptReply(msg, 'You must reach lvl. 20 before you may access cards!');
        return;
    }
    if (!args[0]) {
        attemptReply(msg, 'You must specify the ID of the card you want to give!');
        return;
    }
    if (!parseInt(args[0]) || parseInt(args[0]) <= 0) { // didnt give a valid number
        attemptReply(msg, `\`${args[0]}\` is not a valid card ID`);
        return;
    }
    let card = await db.misc.cards.getCardData(args[0]);
    if (!card) {
        attemptReply(msg, `There is no card with an ID of \`${args[0]}\``);
        return;
    } else if (card.userid !== user.userid) {
        attemptReply(msg, 'That card does not belong to you!');
        return;
    }
    let mentionedUser = msg.mentions.users.first();
    if (!mentionedUser) {
        attemptReply(msg, 'You must mention the user you are giving your card to!');
        return;
    } else if (mentionedUser.id === user.userid) {
        attemptReply(msg, 'You can\'t give a card to yourself!');
        return;
    }
    let mentionedUserAcc = await db.users.fetchUser(mentionedUser.id);
    if (!mentionedUserAcc || mentionedUserAcc.level < 20) {
        attemptReply(msg, 'The user you mentioned must be at least level 20 to receive cards!');
        return;
    } else if (await db.misc.cards.getEntryCount(mentionedUser.id) >= 10) {
        attemptReply(msg, 'The card box of the user you mentioned is full!');
        return;
    }
    // Command GOOD
    db.misc.cards.changeOwner(card.id, mentionedUser.id);
    let options = {
        author: [`${msg.author.tag} (Lvl. ${user.level})`, msg.author.displayAvatarURL()],
        title: `Success!`,
        color: api.visuals.getColor('classic', 'success'),
        description: `<@${mentionedUser.id}> now owns the card with ID \`${card.id}\``
    };
    let embed = await createEmbed(options);
    msg.channel.send(embed);
}

async function sendRing(msg, args, user) {
    if (user.level < 20) { attemptReply(msg, 'You must reach level 20 before you may access rings!'); return; }
    if (!args[0]) { sendAllRings(msg, user); return; }
    if (!parseInt(args[0]) || parseInt(args[0]) <= 0) { // didnt give a valid number
        attemptReply(msg, `\`${args[0]}\` is not a valid ring ID`);
        return;
    }
    args[0] = parseInt(args[0]);
    let ring = await db.misc.rings.getRingData(args[0]);
    if (!ring) {
        attemptReply(msg, `There is no ring with an ID of \`${args[0]}\``);
        return;
    } else if (ring.userid !== user.userid) {
        attemptReply(msg, 'That ring does not belong to you!');
        return;
    }
    // card is real
    let ringInfo = api.fishing.getRingData(ring.ring_type);
    ring.consumer = 100 - (ring.premium + ring.sashimi + ring.trophy);
    let cropY = ringInfo.rating >= 5 ? 0 : 64;
    let canvasBuffer = await createCroppedItemShowcaseCanvas(IMAGES.rings[ring.ring_type.replace(/ /g, '_')], 0, cropY, 256, 320-cropY, 0, 0, 256, 320-cropY);
    let pInfo = await db.users.getPurchases(user.userid);

    // EMBED CONSTRUCTION
    embedDescription = `:ring: Ring Type: ${ringInfo.rating >= 5 ? 'Premium' : 'Regular'}\n:moneybag: Sell Price: ${ring.value} coins\n${user.equipped_ring == ring.id ? ':white_check_mark: Equipped' : ':no_entry_sign: Not Equipped'}`;
    let abilityDescription = '';
    // class boosts
    for (let i=0; i<4; i++) {
        if (ringInfo.classBoost[i] > 0) {
            abilityDescription += `\n+${ringInfo.classBoost[i]}% card drops from **${SIZE_CLASSES[i]}** fish`;
        }
    }
    // grade boosts
    for (let i=0; i<3; i++) {
        if (ringInfo.gradeBoost[i] > 0) {
            abilityDescription += `\n${ringInfo.gradeBoost[i]}% of **${GRADES[i]}** converts to **${GRADES[i+1]}**`;
        }
    }
    if (ringInfo.rating === 0) { abilityDescription += '\nNone' }
    embedFields = [
        { name: 'Card Drop Rates', value: `Small: ${ring.s}%\nMedium: ${ring.m}%\nLarge: ${ring.l}%\nExtra Large: ${ring.xl}%`, inline: true },
        { name: 'Meat Quality Chance', value: `:rock: Consumer: ${ring.consumer}%\n:fried_shrimp: Premium: ${ring.premium}%\n:sushi: Sashimi: ${ring.sashimi}%\n:trophy: Trophy: ${ring.trophy}%`, inline: true },
        { name: 'Ability', value: abilityDescription, inline: false }
    ];

    let options = {
        author: [`${msg.author.tag} (Lvl. ${user.level})`, msg.author.displayAvatarURL()],
        title: `${capitalizeWords(ring.ring_type)} Ring - ${ring.id}`,
        color: api.visuals.getNestedColor('cmd', 'rings', pInfo && pInfo.one_week_host > 0 ? 'oneWeekHost' : 'default'),
        description: embedDescription,
        fields: embedFields,
        attachment: { name: `${ring.ring_type}_ring.png`, content: canvasBuffer }
    };
    let embed = await createEmbed(options);
    msg.channel.send(embed).then(async(sentEmbed) => {
        if (user.equipped_ring == ring.id) { return; } // only do reaction stuff if not equipped
        await sentEmbed.react('✅');
        sentEmbed.react('💰');
        const filter = ( reaction, user ) => (reaction.emoji.name === '💰' ||reaction.emoji.name === '✅') && user.id === msg.author.id;
        const collector = sentEmbed.createReactionCollector(filter, { time: 20000 });
        
        collector.on('collect', async(reactionData) => {
            collector.stop();
            ring = await db.misc.rings.getRingData(args[0]);
            if (!ring) {
                attemptReply(msg, 'You no longer have that ring!');
            } else if (reactionData.emoji.name === '💰') {
                db.users.updateColumn(user.userid, 'coins', ring.value);
                db.misc.rings.removeEntry(ring.id);
                let options = {
                    author: [`${msg.author.tag} (Lvl. ${user.level})`, msg.author.displayAvatarURL()],
                    title: `Success!`,
                    color: api.visuals.getColor('classic', 'success'),
                    description: `You sold your ${ring.ring_type} ring and got ${ring.value} :coin:`
                };
                let embed = await createEmbed(options);
                msg.channel.send(embed);
            } else if (reactionData.emoji.name === '✅') {
                db.users.setColumn(user.userid, 'equipped_ring', ring.id);
                let options = {
                    author: [`${msg.author.tag} (Lvl. ${user.level})`, msg.author.displayAvatarURL()],
                    title: `Success!`,
                    color: api.visuals.getColor('classic', 'success'),
                    description: `You equipped the ${ring.ring_type} ring!`
                };
                let embed = await createEmbed(options);
                msg.channel.send(embed);
            }
        });
        collector.on('end', async() => {
            sentEmbed.reactions.removeAll().catch(() => {
                console.log('Couldn\'t remove RING reactions');
            });
        });
    });
}

async function sendAllRings(msg, user) {
    let rings = await db.misc.rings.getAllEntries(user.userid);

    const pInfo = await db.users.getPurchases(user.userid); // "pInfo"

    let embedDescription = [];
    for (let ring of rings) {
        let premium = api.fishing.ringIsPremium(ring.ring_type);
        let consumerChance = 100 - (ring.premium + ring.sashimi + ring.trophy);
        embedDescription.push(`\`${ring.id}\` - ${user.equipped_ring == ring.id ? ':white_check_mark: ' : ''}${premium ? ':ring:' : ''} **${capitalizeWords(ring.ring_type)} Ring** ${ring.s}/${ring.m}/${ring.l}/${ring.xl} - ${consumerChance}/${ring.premium}/${ring.sashimi}/${ring.trophy}`);
    }

    let options = {
        author: [`${msg.author.tag} (Lvl. ${user.level})`, msg.author.displayAvatarURL()],
        title: `Rings (${rings.length}/10)`,
        color: api.visuals.getNestedColor('cmd', 'rings', pInfo && pInfo.one_week_host > 0 ? 'oneWeekHost' : 'default'),
        description: embedDescription.join('\n') || '*You don\'t have any rings*',
        footer: 'To see a specific ring, use .ring <number>'
    };
    let embed = await createEmbed(options);
    msg.channel.send(embed);
}

async function sendGiveRing(msg, args, user) {
    if (user.level < 20) {
        attemptReply(msg, 'You must reach lvl. 20 before you may access rings!');
        return;
    }
    if (!args[0]) {
        attemptReply(msg, 'You must specify the ID of the ring you want to give!');
        return;
    }
    if (!parseInt(args[0]) || parseInt(args[0]) <= 0) { // didnt give a valid number
        attemptReply(msg, `\`${args[0]}\` is not a valid ring ID`);
        return;
    }
    let ring = await db.misc.rings.getRingData(args[0]);
    if (!ring) {
        attemptReply(msg, `There is no ring with an ID of \`${args[0]}\``);
        return;
    } else if (ring.userid !== user.userid) {
        attemptReply(msg, 'That ring does not belong to you!');
        return;
    } else if (user.equipped_ring == ring.id) {
        attemptReply(msg, 'You cannot give a ring that you have equipped!');
        return;
    }
    let mentionedUser = msg.mentions.users.first();
    if (!mentionedUser) {
        attemptReply(msg, 'You must mention the user you are giving your ring to!');
        return;
    } else if (mentionedUser.id === user.userid) {
        attemptReply(msg, 'You can\'t give a ring to yourself!');
        return;
    }
    let mentionedUserAcc = await db.users.fetchUser(mentionedUser.id);
    if (!mentionedUserAcc || mentionedUserAcc.level < 20) {
        attemptReply(msg, 'The user you mentioned must be at least level 20 to receive rings!');
        return;
    } else if (await db.misc.rings.getEntryCount(mentionedUser.id) >= 10) {
        attemptReply(msg, 'That user already has 10 rings!');
        return;
    }
    // Command GOOD
    db.misc.rings.changeOwner(ring.id, mentionedUser.id);
    let options = {
        author: [`${msg.author.tag} (Lvl. ${user.level})`, msg.author.displayAvatarURL()],
        title: `Success!`,
        color: api.visuals.getColor('classic', 'success'),
        description: `<@${mentionedUser.id}> now owns the **${ring.ring_type} ring** with ID \`${ring.id}\``
    };
    let embed = await createEmbed(options);
    msg.channel.send(embed);
}