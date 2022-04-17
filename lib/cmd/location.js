// Handle "location", "locations/weather", "setlocation" Commands
// # ---------------------------------------------------------- #

const { MessageAttachment } = require('discord.js');

const api = require('../../api');
const db = require('../../db');
const logic = require('../logic');

const { createLocationBackgroundCanvas } = require('../misc/canvas.js');
const { sendReply } = require('../misc/reply.js');

const WEATHER_EMOJIS = [':sunny:', ':partly_sunny:', ':cloud:', ':cloud_rain:', ':thunder_cloud_rain:'];

module.exports.sendSetLocationCommand = async function(interaction, user, locationId) {
    // SETLOCATION
    // Step 1 - Validate Id Argument
    if (!locationId && locationId !== 0) { return sendReply(interaction, 'You must specify the location to set to!'); } // text-based command calls
    if (locationId <= 0) { return sendReply(interaction, `**${locationId}** is not a valid location id!`); }
    const LocationData = api.fish.getLocationData(locationId);
    if (!LocationData) { return sendReply(interaction, `**${locationId}** is not a valid location id!`); }
    if (user.location === locationId) { return sendReply(interaction, `Location ${locationId} is already your current location!`); }
    if (user.level < LocationData.level) { return sendReply(interaction, 'You have not unlocked this location yet!'); }

    // Step 2 - Update Database
    await db.users.setColumns(user.userid, { location: locationId });

    // Step 3 - Send Embed
    let embed = {
        color: logic.color.STATIC.location[locationId - 1],
        title: `Your location has been set to ${locationId} - ${LocationData.name}`,
        author: {
            name: `${interaction.user.username}#${interaction.user.discriminator} (Lvl. ${user.level})`,
            icon_url: interaction.user.displayAvatarURL()
        }
    };
    sendReply(interaction, { embeds: [embed] });
}

module.exports.sendLocationCommand = async function(interaction, user, locationId) {
    // LOCATION
    // Step 1 - Validate Id Argument
    if (!locationId) { return sendReply(interaction, 'You must specify the id (positive number) of the location to view!'); } // text-based command calls
    if (locationId <= 0) { return sendReply(interaction, `**${locationId}** is not a valid location id!`); }
    const LocationData = api.fish.getLocationData(locationId);
    if (!LocationData) { return sendReply(interaction, `**${locationId}** is not a valid location id!`); }
    if (user.level < LocationData.level - 10) { return sendReply(interaction, 'You must be a higher level to view the information of this location!'); }

    // Step 2 - Fetch Variables
    const weatherId = (await db.weather.getCurrentEntry())[`l${locationId}`];
    let embedFields = [], locationLockedString = '';
    if (user.level < LocationData.level) {
        locationLockedString = '\n:closed_lock_with_key: You may view fish once you have unlocked this location.';
    } else {
        let LocationFishData = api.fish.getFishDataFromLocation(locationId);
        embedFields = ['Small', 'Medium', 'Large', 'Extra Large'].map(size => {
            return { name: size, value: '\u200b' };
        });
        for (const fish of LocationFishData) {
            embedFields[fish.sizeClass-1].value += `${logic.text.capitalizeWords(fish.name.replace(/_/g, ' '))} (${logic.text.kgToWeight(fish.sizeMin)} - ${logic.text.kgToWeight(fish.sizeMax)}) ${fish.legendary ? api.emoji.WHITE_STAR : ''}\n`;
        }
        /*if (LocationData.legendary) {
            const fish = api.fish.getFishData(LocationData.legendary);
            embedFields.push({ name: 'Legendary', value: `${logic.text.capitalizeWords(fish.name.replace(/_/g, ' '))} (${logic.text.kgToWeight(fish.sizeMin)} - ${logic.text.kgToWeight(fish.sizeMax)})\n` });
        }*/
    }

    // Step 3 - Render Canvas
    const canvasBuffer = await createLocationBackgroundCanvas(locationId);
    const attachment = new MessageAttachment(canvasBuffer, `location_${locationId}.png`);

    // Step 4 - Send Embed
    let embed = {
        color: logic.color.STATIC.location[locationId - 1],
        title: `Location ${locationId} - ${LocationData.name} ${WEATHER_EMOJIS[weatherId]}`,
        description: `:star2: Unlocks at Lvl. ${LocationData.level}${locationLockedString}`,
        fields: embedFields,
        image: {
            url: `attachment://location_${locationId}.png`
        }
    };
    sendReply(interaction, { embeds: [embed], files: [attachment] });
}

module.exports.sendLocationsCommand = async function(interaction, user) {
    // LOCATIONS/WEATHER
    // Step 1 - Fetch Data
    const weatherEntry = await db.weather.getCurrentEntry();
    const UnlockedLocationData = api.fish.getAllUnlockedLocationData(user.level);
    const LockedLocation = api.fish.getLocationData(UnlockedLocationData.length + 1);
    let lockedLocationString = '';
    if (LockedLocation) { lockedLocationString = `\n\`${LockedLocation.id}\` ${LockedLocation.name} :lock: \`Lvl. ${LockedLocation.level}\``; }
    // Step 2 - Send Embed
    let embed = {
        color: logic.color.STATIC.light,
        title: 'Viewable Locations',
        description: `*use \`/setlocation\` to set your location.*
*use \`/location\` to learn more about a location.*
\n${UnlockedLocationData.map((obj, i) => `\`${i+1}\` ${obj.name} ${WEATHER_EMOJIS[weatherEntry[`l${i+1}`]]}`).join('\n')}\
${lockedLocationString}`,
        footer: {
            text: `New weather in ${logic.text.millisToString(weatherEntry.end_time - Date.now())}`
        }
    };
    sendReply(interaction, { embeds: [embed] });
}