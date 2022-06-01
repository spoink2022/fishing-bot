// Handle "aquarium", "aquariums", "scores", "collect" Command
// # ------------------------------------------------------- #

const { MessageAttachment } = require('discord.js');

const api = require('../../api');
const db = require('../../db');
const logic = require('../logic');

const { getTutorialFourEmbed } = require('./tutorial.js');

const { calculateFishWeight, calculateRawEarnRate, calculateFisherScores } = require('../misc/calculations.js');
const { createAquariumCanvas } = require('../misc/canvas.js');
const { handleMessageReplyError } = require('../misc/error.js');
const { sendReply } = require('../misc/reply.js');

module.exports.sendScoresCommand = async function(interaction, user, locationId, mentionedUser) {
    // SCORES
    // Step 1 - Validate menitonedUser Argument
    if (mentionedUser && mentionedUser.id !== user.userid) {
        if (mentionedUser.bot) {
            return sendReply(interaction, `**${mentionedUser.username}** is a bot and cannot have a Big Tuna account!`);
        }
        user = await db.users.fetchUser(mentionedUser.id);
        
        if (!user) {
            return sendReply(interaction, `**${mentionedUser.username}** has not used Big Tuna before!`);
        } else if (!user.opted_in) {
            return sendReply(interaction, `**${mentionedUser.username}** is not opted in! They must use the \`/optin\` command to make their stats publicy visible.`);
        }
    }

    // Step 2 - Validate locationId Argument
    if (!locationId) { return sendReply(interaction, 'You must specify a location to view scores for!'); }
    const LocationData = api.fish.getLocationData(locationId);
    if (!LocationData) { // not real location
        return sendReply(interaction, `**Location ${locationId}** is not a valid location!`);
    } else if (locationId > Math.floor(user.level/10) + 1) { // not unlocked location
        if (mentionedUser.id === interaction.user.id) {
            return sendReply(interaction, `You have not unlocked **location ${locationId}** yet!`);
        } else {
            return sendReply(interaction, `**${mentionedUser.username}** has not unlocked **location ${locationId}** yet!`);
        }
    }
    
    // Step 3 - Fetch Variables
    const FishData = api.fish.getFishDataFromLocation(locationId);
    const FishNames = FishData.map(obj => obj.name); // convenience & performance
    const FishValues = await db.aquarium.getFish(user.userid, FishNames);
    const FishScores = calculateFisherScores(FishValues, FishData);
    const LocationRank = await db.scores.fetchScoreRank(user.userid, locationId);
    const legendaryCount = LocationData.legendary ? 1 : 0;

    // Step 4 - Send Embed
    let embedFieldVal = '\u200b';
    let FishWeights = {};
    for (let i=0; i<FishNames.length; i++) { FishWeights[FishNames[i]] = calculateFishWeight(FishValues[FishNames[i]], FishData[i]); }
    embedFieldVal += FishNames.filter(name => FishValues[name] !== -1).map(
        name => `**${FishScores[name].toFixed(1)}** - ${logic.text.capitalizeWords(name.replace(/_/g, ' '))} - ${logic.text.kgToWeight(FishWeights[name])} (${logic.text.rToTier(FishValues[name])})`
        ).join('\n');
    
    let embed = {
        color: logic.color.STATIC.location[locationId-1],
        title: `Scores for Aquarium ${locationId} - ${LocationData.name}`,
        description: `${api.emoji.LOGO_TRANSPARENT} Location Score: **${Object.values(FishScores).reduce((a, b) => a + b, 0).toFixed(1)}**
:globe_with_meridians: Global Location Rank: **${logic.text.numToRank(LocationRank)}**`,
        author: {
            name: `${mentionedUser.tag} (Lvl. ${user.level})`,
            icon_url: mentionedUser.displayAvatarURL()
        },
        fields: [{
            name: `${Object.values(FishValues).filter(value => value !== -1).length}/${FishNames.length - legendaryCount} Fish Found`, value: embedFieldVal
        }]
    };
    sendReply(interaction, { embeds: [embed] });
}

module.exports.sendAquariumCommand = async function(interaction, user, locationId, mentionedUser) {
    // AQUARIUM
    // Step 1 - Validate mentionedUser Argument
    if (mentionedUser && mentionedUser.id !== user.userid) {
        if (mentionedUser.bot) {
            return sendReply(interaction, `**${mentionedUser.username}** is a bot and cannot have a Big Tuna account!`);
        }
        user = await db.users.fetchUser(mentionedUser.id);
        
        if (!user) {
            return sendReply(interaction, `**${mentionedUser.username}** has not used Big Tuna before!`);
        } else if (!user.opted_in) {
            return sendReply(interaction, `**${mentionedUser.username}** is not opted in! They must use the \`/optin\` command to make their stats publicy visible.`);
        }
    }

    if (!locationId) { locationId = user.location; } // Do this here to account for mentionedUser

    // Step 2 - Validate Location Argument
    const LocationData = api.fish.getLocationData(locationId);
    if (!LocationData) { // not real location
        return sendReply(interaction, `**Location ${locationId}** is not a valid location!`);
    } else if (locationId > Math.floor(user.level/10) + 1) { // not unlocked location
        if (mentionedUser.id === interaction.user.id) {
            return sendReply(interaction, `You have not unlocked **location ${locationId}** yet!`);
        } else {
            return sendReply(interaction, `**${mentionedUser.username}** has not unlocked **location ${locationId}** yet!`);
        }
    }

    // Step 3 - Construct Variables
    const AquariumData = api.aquarium.getAquariumData(user.aquarium);
    const clan = await db.clan.fetchClanByUserid(user.userid);
    const capacityMultiplier = logic.clan.getAquariumCapacityIncrease(clan);

    const FishData = api.fish.getFishDataFromLocation(locationId);
    const FishNames = FishData.map(obj => obj.name); // convenience & performance
    const FishValues = await db.aquarium.getFish(user.userid, FishNames);
    const rawEarnRate = calculateRawEarnRate(Object.values(FishValues), FishData.map(obj => obj.chance));
    const earnRate = rawEarnRate * AquariumData.multiplier;

    let lastCollected = user.aquarium_collected[locationId - 1];
    if (!lastCollected && lastCollected != 0) {
        const appendArray = Array(locationId-user.aquarium_collected.length).fill(Date.now());
        await db.users.appendToAquariumCollected(user.userid, appendArray);
        lastCollected = Date.now();
    }

    const capacity = Math.floor(AquariumData.max * (1 + capacityMultiplier/100));
    const hoursElapsed = (Date.now() - lastCollected) / 3600000;
    const earned = Math.min(Math.floor(earnRate * hoursElapsed * 10) / 10, capacity);
    const legendaryCount = LocationData.legendary ? 1 : 0;

    // Step 4 - Render Canvas
    const canvasBuffer = await createAquariumCanvas(user, locationId, FishValues, FishData);
    const attachment = new MessageAttachment(canvasBuffer, `${user.userid}_aquarium_${locationId}.png`);

    // Step 5 - Send Embed
    let embedFieldVal = '\u200b';
    let FishWeights = {};
    for (let i=0; i<FishNames.length; i++) { FishWeights[FishNames[i]] = calculateFishWeight(FishValues[FishNames[i]], FishData[i]); }
    embedFieldVal += FishNames.filter(name => FishValues[name] !== -1).map(
        name => `**(${logic.text.rToTier(FishValues[name])})** ${logic.text.capitalizeWords(name.replace(/_/g, ' '))} - ${logic.text.kgToWeight(FishWeights[name])}`
        ).join('\n');

    let embed = {
        color: logic.color.STATIC.location[locationId-1],
        title: `Aquarium ${locationId} - ${LocationData.name} (${earnRate.toFixed(1)}/hr)`,
        author: {
            name: `${mentionedUser.tag} (Lvl. ${user.level})`,
            icon_url: mentionedUser.displayAvatarURL()
        },
        description: `Coins Earned: ${earned}/${capacity} :coin:\
${user.level < 10 ? '\n(collect coins from your aquarium with `/collect`)' : ''}`,
        fields: [{
            name: `${Object.values(FishValues).filter(value => value !== -1).length}/${FishNames.length - legendaryCount} Fish Found`, value: embedFieldVal
        }],
        image: {
            url: `attachment://${user.userid}_aquarium_${locationId}.png`
        }
    };

    let embedArr = [embed];

    if (user.tutorial === 3) {
        embedArr.push(await getTutorialFourEmbed(interaction, user));
    }

    sendReply(interaction, { embeds: embedArr, files: [attachment] });
}

module.exports.sendAquariumsCommand = async function(interaction, user, mentionedUser) {
    // AQUARIUMS
    // Step 1 - Validate mentionedUser Argument
    if (mentionedUser && mentionedUser.id !== user.userid) {
        if (mentionedUser.bot) {
            return sendReply(interaction, `**${mentionedUser.username}** is a bot and cannot have a Big Tuna account!`);
        }
        user = await db.users.fetchUser(mentionedUser.id);
        if (!user) {
            return sendReply(interaction, `**${mentionedUser.username}** has not used Big Tuna before!`);
        } else if (!user.opted_in) {
            return sendReply(interaction, `**${mentionedUser.username}** is not opted in! They must use the \`/optin\` command to make their stats publicy visible.`);
        }
    }

    // Step 2 - Construct Variables
    const AquariumData = api.aquarium.getAquariumData(user.aquarium);
    const clan = await db.clan.fetchClanByUserid(user.userid);
    const capacityMultiplier = logic.clan.getAquariumCapacityIncrease(clan);

    const FishData = api.fish.getAllUnlockedFishData(user.level);
    const LocationData = api.fish.getAllUnlockedLocationData(user.level);
    const FishNames = FishData.map(obj => obj.name); // convenience & performance
    const FishValues = Object.values(await db.aquarium.getFish(user.userid, FishNames));

    const FishChances = FishData.map(obj => obj.chance);
    const capacity = Math.floor(AquariumData.max * (1+capacityMultiplier/100));

    // Step 3 - Calculate Coins Available From Each Aquarium
    let coinsAvailable = [];
    let earnRates = [];
    if (user.aquarium_collected.length < LocationData.length) {
        const appendArray = Array(LocationData.length-user.aquarium_collected.length).fill(Date.now());
        await db.users.appendToAquariumCollected(user.userid, appendArray);
        user.aquarium_collected = user.aquarium_collected.concat(appendArray);
    }
    for (let i=0; i<LocationData.length; i++) {
        const location = LocationData[i];

        const rawEarnRate = calculateRawEarnRate(
            FishValues.slice(location.fish[0].id - 1, location.fish[location.fish.length-1].id),
            FishChances.slice(location.fish[0].id - 1, location.fish[location.fish.length-1].id)
        );
        const earnRate = rawEarnRate * AquariumData.multiplier;

        let lastCollected = user.aquarium_collected[location.id - 1];

        const hoursElapsed = (Date.now() - lastCollected) / 3600000;
        const earned = Math.min(Math.floor(earnRate * hoursElapsed * 10) / 10, capacity);

        coinsAvailable.push(Math.floor(earned));
        earnRates.push(earnRate);
    }

    // Step 4 - Send Embed
    const embedFields = LocationData.map(obj => {
        return {
            name: `(${obj.id}) ${obj.name}`,
            value: `${coinsAvailable[obj.id-1]}/${capacity} coins
${earnRates[obj.id-1].toFixed(1)}/hr`,
            inline: true
        };
    });
    if (embedFields.length % 3 === 2) { embedFields.push({ name: '\u200b', value: '\u200b', inline: true }); }

    let embed = {
        color: logic.color.byPurchase(user),
        title: `Aquariums Overview`,
        author: {
            name: `${mentionedUser.tag} (Lvl. ${user.level})`,
            icon_url: mentionedUser.displayAvatarURL()
        },
        description: `**Totals**
Total Coins Available: ${coinsAvailable.reduce((a, b) => a + b)}/${capacity * LocationData.length}
Total Earn Rate: ${earnRates.reduce((a, b) => a + b).toFixed(1)}/hr
\n**Perks/Bonus Info (included in totals)**
Aquarium: *${logic.text.capitalizeWords(AquariumData.name.replace(/_/g, ' '))} Aquarium*
Coin Bonus (aquarium): +${Math.round(AquariumData.multiplier*100 - 100)}% coins/hr
Capacity Bonus (clan perks): +${capacityMultiplier}% coin capacity\n\u200b`,
        fields: embedFields
    };
    sendReply(interaction, { embeds: [embed] });
}

module.exports.sendCollectCommand = async function(interaction, user) {
    // COLLECT
    // Step 1 - Construct Variables
    const AquariumData = api.aquarium.getAquariumData(user.aquarium);
    const clan = await db.clan.fetchClanByUserid(user.userid);
    const capacityMultiplier = logic.clan.getAquariumCapacityIncrease(clan);

    const FishData = api.fish.getAllUnlockedFishData(user.level);
    const LocationData = api.fish.getAllUnlockedLocationData(user.level);
    const FishNames = FishData.map(obj => obj.name); // convenience & performance
    const FishValues = Object.values(await db.aquarium.getFish(user.userid, FishNames));
    const FishChances = FishData.map(obj => obj.chance);
    const capacity = Math.floor(AquariumData.max * (1+capacityMultiplier/100));

    // Step 2 - Calculate Coins To Collect From Each Location
    let coinsCollected = [];
    if (user.aquarium_collected.length < LocationData.length) {
        const appendArray = Array(LocationData.length-user.aquarium_collected.length).fill(Date.now());
        await db.users.appendToAquariumCollected(user.userid, appendArray);
        user.aquarium_collected = user.aquarium_collected.concat(appendArray);
    }
    for (let i=0; i<LocationData.length; i++) {
        const location = LocationData[i];

        const rawEarnRate = calculateRawEarnRate(
            FishValues.slice(location.fish[0].id - 1, location.fish[location.fish.length-1].id),
            FishChances.slice(location.fish[0].id - 1, location.fish[location.fish.length-1].id)
        );
        const earnRate = rawEarnRate * AquariumData.multiplier;

        let lastCollected = user.aquarium_collected[location.id - 1];

        const hoursElapsed = (Date.now() - lastCollected) / 3600000;
        const earned = Math.min(Math.floor(earnRate * hoursElapsed * 10) / 10, capacity);

        coinsCollected.push(Math.floor(earned));
    }

    // Handle Case: No Coins
    const totalCoinsCollected = coinsCollected.reduce((a, b) => a + b);
    if ( totalCoinsCollected === 0) {
        return sendReply(interaction, 'You don\'t have any coins in your aquariums to collect!')
    }

    // Step 3 - Update Database
    if (user.quest_type === 3 && user.quest_progress !== user.quest_requirement) {
        user.quest_progress = Math.min(user.quest_requirement, user.quest_progress + totalCoinsCollected);
        db.users.setColumn(user.userid, 'quest_progress', user.quest_progress);
    }
    let newAquariumCollected = [];
    for (let i=0; i<coinsCollected.length; i++) {
        newAquariumCollected.push(coinsCollected[i] === 0 ? user.aquarium_collected[i] : Date.now());
    }
    await db.users.handleAquariumCollect(user.userid, totalCoinsCollected, newAquariumCollected);

    // Step 4 - Send Embed
    let embed = {
        color: logic.color.STATIC.coin,
        title: `You collected a total of ${totalCoinsCollected} coin${totalCoinsCollected !== 1 ? 's' : ''}!`,
        author: {
            name: `${interaction.user.tag} (Lvl. ${user.level})`,
            icon_url: interaction.user.displayAvatarURL()
        },
        description: `You now have ${user.coins + totalCoinsCollected} coins!`,
    };
    sendReply(interaction, { embeds: [embed] }).catch(err => handleMessageReplyError(err));
}