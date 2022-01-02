// Handle "location", "weather" Commands
// # --------------------------------- #

const { MessageAttachment } = require('discord.js');

const api = require('../../api');
const db = require('../../db');
const logic = require('../logic');

const { createLocationBackgroundCanvas } = require('../misc/canvas.js');

const WEATHER_EMOJIS = [':sunny:', ':partly_sunny:', ':cloud:', ':cloud_rain:', ':thunder_cloud_rain:'];

module.exports.sendLocationCommand = async function(interaction, user) {
    // LOCATION
    // Step 1 - Validate Id Argument
    const locationId = interaction.options.getInteger('id');
    if (locationId <= 0) { return interaction.reply(`**${locationId}** is not a valid location id!`); }
    const LocationData = api.fish.getLocationData(locationId);
    if (!LocationData) { return interaction.reply(`**${locationId}** is not a valid location id!`); }
    if (user.level < LocationData.level) { return interaction.reply('You have not unlocked this location yet!'); }

    // Step 2 - Fetch Variables
    const weatherId = (await db.weather.getCurrentEntry())[`l${locationId}`];
    const LocationFishData = api.fish.getFishDataFromLocation(locationId);
    const embedFields = ['Small', 'Medium', 'Large', 'Extra Large'].map(size => {
        return { name: size, value: '' };
    });
    for (const fish of LocationFishData) {
        embedFields[fish.sizeClass-1].value += `${logic.text.capitalizeWords(fish.name.replace(/_/g, ' '))} (${logic.text.kgToWeight(fish.sizeMin)} - ${logic.text.kgToWeight(fish.sizeMax)})\n`;
    }

    // Step 3 - Render Canvas
    const canvasBuffer = await createLocationBackgroundCanvas(locationId);
    const attachment = new MessageAttachment(canvasBuffer, `location_${locationId}.png`);

    // Step 4 - Send Embed
    let embed = {
        color: logic.color.STATIC.location[locationId - 1],
        title: `Location ${locationId} - ${LocationData.name} ${WEATHER_EMOJIS[weatherId]}`,
        description: `:star2: Unlocks at Lvl. ${LocationData.level}`,
        fields: embedFields,
        image: {
            url: `attachment://location_${locationId}.png`
        }
    };
    interaction.reply({ embeds: [embed], files: [attachment] });
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
    interaction.reply({ embeds: [embed] });
}