const api = require('../../api');

const { millisToTimeString } = require('../misc/datetime.js');
const { createEmbed } = require("../misc/embed");

module.exports.c = {
    'vote': ['v']
};

module.exports.run = async function(msg, cmd, args, user) {
    if(cmd === 'vote') { sendVote(msg, user); }
}

async function sendVote(msg, user) {
    let timeToVote = user.next_vote - Date.now();
    let readyString;
    let embedColor;
    if(timeToVote <= 0) {
        readyString = '(should be ready)';
        embedColor = api.visuals.getColor('cmd', 'voteReady');
    } else {
        readyString = `(ready in: ${millisToTimeString(timeToVote)})`;
        embedColor = api.visuals.getColor('cmd', 'voteNotReady');
    }

    let options = {
        author: [`${msg.author.tag} (Lvl. ${user.level})`, msg.author.displayAvatarURL()],
        title: `Vote for Big Tuna`,
        color: embedColor,
        description: `Immediately be able to fish again! :fishing_pole_and_fish:\n\nVote here ${readyString}:\nhttps://top.gg/bot/803361191166607370/vote :link:`
    };
    let embed = await createEmbed(options);
    msg.channel.send(embed);
}