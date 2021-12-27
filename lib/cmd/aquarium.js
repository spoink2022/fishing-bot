// Handle "aquarium" Command
// # ---------------------- #

const { MessageAttachment } = require('discord.js');

const api = require('../../api');
const db = require('../../db');
const logic = require('../logic');

const { calculateFishWeight, calculateRawEarnRate } = require('../misc/calculations.js');
const { createAquariumCanvas } = require('../misc/canvas.js');

module.exports.sendAquariumCommand = async function(interaction, user) {
    // AQUARIUM
    // Step 1 - Validate User Argument
    const mentionedUser = interaction.options.getUser('user') || interaction.user;
    if (mentionedUser && mentionedUser.id !== interaction.user.id) {
        if (mentionedUser.bot) {
            return interaction.reply(`**${mentionedUser.username}** is a bot and cannot have a Big Tuna account!`);
        }
        user = await db.users.fetchUser(mentionedUser.id);
        if (!user) {
            return interaction.reply(`**${mentionedUser.username}** has not used Big Tuna before!`);
        } else if (!user.opted_in) {
            return interaction.reply(`**${mentionedUser.username}** is not opted in! They must use the \`optin\` command to make their stats publicy visible.`);
        }
    }

    // Step 2 - Validate Location Argument
    const locationId = interaction.options.getInteger('location') || user.location;
    const LocationData = api.fish.getLocationData(locationId);
    if (!LocationData) { // not real location
        return interaction.reply(`**Location ${locationId}** is not a valid location!`);
    } else if (locationId > Math.floor(user.level/10) + 1) { // not unlocked location
        if (mentionedUser.id === interaction.user.id) {
            return interaction.reply(`You have not unlocked **location ${locationId}** yet!`);
        } else {
            return interaction.reply(`**${mentionedUser.username}** has not unlocked **location ${locationId}** yet!`);
        }
    }

    // Step 3 - Construct Variables
    const AquariumData = api.aquarium.getAquariumData(user.aquarium);
    const clan = await db.clan.fetchClan(user.clan);
    const capacityMultiplier = logic.clan.getAquariumCapacityIncrease(clan);

    const FishData = api.fish.getFishDataFromLocation(locationId);
    const FishNames = FishData.map(obj => obj.name); // convenience & performance
    const FishValues = await db.aquarium.getFish(user.userid, FishNames);
    const rawEarnRate = calculateRawEarnRate(Object.values(FishValues), FishData.map(obj => obj.chance));
    const earnRate = rawEarnRate * AquariumData.multiplier;

    const capacity = Math.floor(AquariumData.max * (1+capacityMultiplier/100));
    const lastCollected = await db.users.getLastCollected(user.userid, locationId);
    const hoursElapsed = (Date.now() - lastCollected) / 3600000;
    const earned = Math.min(Math.floor(earnRate * hoursElapsed * 10) / 10, capacity);

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
            name: `${mentionedUser.username}#${interaction.user.discriminator} (Lvl. ${user.level})`,
            icon_url: mentionedUser.displayAvatarURL()
        },
        description: `Coins Earned: ${earned}/${capacity} :coin:\
${user.level < 10 ? '\n(collect with the `collect` command)' : ''}`,
        fields: [{
            name: `${Object.values(FishValues).filter(value => value !== -1).length}/${FishNames.length} Fish Found`, value: embedFieldVal
        }],
        image: {
            url: `attachment://${user.userid}_aquarium_${locationId}.png`
        }
    }
    interaction.reply({ embeds: [embed], files: [attachment] });
}