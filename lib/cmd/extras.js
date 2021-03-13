const api = require('../../api');

const { millisToTimeString } = require('../misc/datetime.js');
const { createEmbed } = require("../misc/embed");

module.exports.c = {
    'vote': ['v'],
    'server': []
};

module.exports.run = async function(msg, cmd, args, user) {
    if(cmd === 'vote') { sendVote(msg, user); }
    else if(cmd === 'server') { sendServer(msg); }
}

async function attemptReply(msg, str) {
    if(msg.channel.type === 'dm') { msg.channel.send(str); }
    else { msg.reply(str); }
}

async function sendVote(msg, user) {
    let timeToVote = user.next_vote - Date.now();
    let readyString;
    let embedColor;
    if(timeToVote <= 0) {
        readyString = '(should be ready)';
        embedColor = api.visuals.getColor('cmd', 'voteReady');
    } else {
        readyString = `(ready in ${millisToTimeString(timeToVote)})`;
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

async function sendServer(msg) {
    let options = {
        title: "Join the Official Big Tuna Discord Server",
        color: api.visuals.getColor('cmd', 'server'),
        description: '- Active fishing community :fishing_pole_and_fish:\n\
        - Competitive leaderboards :globe_with_meridians:\n- Ask questions :question:\n\
        - View upcoming game updates :mailbox_with_mail:\n\n**https://discord.gg/RaN2VE9zpa**'
    };
    let embed = await createEmbed(options);
    msg.channel.send(embed);
}