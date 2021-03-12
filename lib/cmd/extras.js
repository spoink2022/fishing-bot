const api = require('../../api');

const { createEmbed } = require("../misc/embed");

module.exports.c = {
    'vote': ['v']
};

module.exports.run = async function(msg, cmd, args, user) {
    if(cmd === 'vote') { sendVote(msg); }
}

async function sendVote(msg) {
    let options = {
        title: 'Vote for Big Tuna',
        color: api.visuals.getColor('cmd', 'vote'),
        description: 'Immediately be able to fish again! :fishing_pole_and_fish:\n\nVote here:\nhttps://top.gg/bot/803361191166607370/vote :link:'
    };
    let embed = await createEmbed(options);
    msg.channel.send(embed);
}