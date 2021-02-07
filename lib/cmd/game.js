const api = require('../../api');
const db = require('../../db');

const { createCanvasForFishingPre, createCanvasForFishingPost } = require('../misc/canvas.js');
const { millisToTimeString } = require('../misc/datetime.js');
const { createEmbed } = require('../misc/embed.js');
const gameLogic = require('../misc/game_logic.js');

module.exports.c = {
    'fish': ['f', 'fi', 'fis', 'fishy'],
    'aquarium': ['a', 'aq']
};

module.exports.run = async function(msg, cmd, args, user) {
    if(cmd === 'fish') { sendFish(msg, user); }
    else if(cmd === 'aquarium') { sendAquarium(msg, args, user); }
}

async function sendFish(msg, user) {
    // check to ensure user is not on cooldown
    let fishingInfo = await db.fishing.fetchFishingInfo(msg.author.id);
    let rodCooldown = api.fishing.getRodData(fishingInfo.rod).cooldown;
    let remainingCooldown = user.cooldown+rodCooldown-Date.now();
    if(remainingCooldown > 0) { // can't fish yet
        msg.channel.send(`Please wait **${millisToTimeString(remainingCooldown)}** to fish again!`);
        return;
    }
    await db.users.resetFishingCooldown(msg.author.id);

    // generate fish, canvas
    let locationInfo = api.fishing.getLocationData(fishingInfo.location);
    let possibleFishIDs = gameLogic.getPossibleFishIDs(locationInfo.trashChance, locationInfo.fish);
    let possibleFish = gameLogic.getPossibleFish(possibleFishIDs); // takes IDs and returns fish objects
    let res = await createCanvasForFishingPre(locationInfo.id, possibleFish);
    let canvas = res[0], centerCoords = res[1];
    
    // generate & send embed
    let options = {
        author: [`${msg.author.tag} (Lvl. ${user.level})`, msg.author.displayAvatarURL()],
        title: `World ${locationInfo.id + 1} - ${locationInfo.name}`,
        attachment: { name: 'fishing.png', content: await canvas.toBuffer()}
    };
    let embed = await createEmbed(options);
    await msg.channel.send(embed).then(async (sentEmbed) => {
        let fish = possibleFish[0];
        let fishInfo = api.fishing.getFishData(fish.id);
        fish.centerCoords = centerCoords;
        let descriptionSuffix = '';

        // determine coins and exp gained + consider a level up
        const lineInfo = api.fishing.getLineData(fishingInfo.line);
        const lineSnapped = fish.weight > lineInfo.maxWeight;
        let coinsGained = fish.tier === 'f' ? 0 : Math.max(Math.ceil(fish.weight * fishInfo.value), 2);
        let expGained = Math.max(Math.ceil(coinsGained * 2.5), 1);
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
        });

        // handle aquarium stuff
        if(fish.tier !== 'f' && !lineSnapped) {
            var oldAquariumEntry = await db.aquarium.getLargestSize(msg.author.id, fishInfo.name);
            if(!oldAquariumEntry || oldAquariumEntry < fish.sizeMult) {
                db.aquarium.setLargestSize(msg.author.id, fishInfo.name, fish.sizeMult, fish.imgNum);
                descriptionSuffix += `\nPersonal best ${fishInfo.name} catch! Sent to aquarium :truck:`;
            }
        }

        // create canvas & embed
        let newCanvasBuffer = await createCanvasForFishingPost(locationInfo.id, canvas, fish);
        let options = {
            author: [`${msg.author.tag} (Lvl. ${user.level})`, msg.author.displayAvatarURL()],
            title: `Caught ${fish.tier === 'f' ? 'trash!' : `a ${fishInfo.name}!`}`,
            description: `Gained ${coinsGained} coins! :coin:\nGained ${expGained} exp! :star:${descriptionSuffix}`,
            fields: fish.tier === 'f' ? [] : [{ name: 'Weight :scales:', value: `${fish.weight}kg`, inline: true }],
            attachment: { name: 'catch.png', content: newCanvasBuffer}
        };
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
    
}