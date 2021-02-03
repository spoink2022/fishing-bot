const api = require('../../api');
const db = require('../../db');

const { createCanvasForFishing } = require('../misc/canvas.js');
const { createEmbed } = require('../misc/embed.js');
const gameLogic = require('../misc/game_logic.js');

module.exports.c = {
    'fish': ['f', 'fi', 'fis', 'fishy']
};

module.exports.run = async function(msg, cmd, args, user) {
    if(cmd === 'fish') { sendFish(msg, user); }
}

async function sendFish(msg, user) {
    const startTime = Date.now();

    let fishingInfo = await db.fishing.fetchFishingInfo(msg.author.id);
    let locationInfo = api.fishing.getLocationData(fishingInfo.location);
    
    let possibleFishIDs = gameLogic.getPossibleFishIDs(locationInfo.trashChance, locationInfo.fish);
    let possibleFish = gameLogic.getPossibleFish(possibleFishIDs); // takes IDs and returns fish objects
    let canvasBuffer = await createCanvasForFishing(locationInfo.id, possibleFish);
    
    let options = {
        title: 'POTA',
        attachment: { name: `${locationInfo.name}.png`, content: canvasBuffer}
    };
    let embed = await createEmbed(options);
    await msg.channel.send(embed);
    msg.channel.send(`This message took ${Date.now() - startTime}ms`);
    console.log(possibleFish);
}