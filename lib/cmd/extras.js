const api = require('../../api');
const db = require('../../db');

const { millisToTimeString } = require('../misc/datetime.js');
const { createEmbed } = require("../misc/embed");

module.exports.c = {
    'vote': ['v'],
    'server': [],
    'redeem': []
};

module.exports.run = async function(msg, cmd, args, user) {
    switch (cmd) {
        case 'vote':
            sendVote(msg, user);
            break;
        case 'server':
            sendServer(msg);
            break;
        case 'redeem':
            sendRedeem(msg);
            break;
    }
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

async function sendRedeem(msg) {
    if (msg.channel.type === 'dm') {
        msg.channel.send('This command can only be used in servers!'); return;
    }
    let server = await db.servers.fetchServer(msg.guild.id);
    if (server.custom_fish_privilege) {
        attemptReply(msg, 'This server already has custom fish command privileges!'); return;
    }
    let purchases = await db.users.getPurchases(msg.author.id);
    if (purchases.custom_fish <= 0) {
        attemptReply(msg, 'You have not purchased this perk!\nPlease visit https://bigtuna.xyz/shop'); return;
    }
    // Carry out the transaction
    db.servers.setColumn(msg.guild.id, 'custom_fish_privilege', true);
    let remaining = await db.users.decrementCustomFish(msg.author.id);
    msg.channel.send(`Success! This server now has custom fish command privileges!\nYou now have **${remaining}** grant${remaining===1 ? '' : 's'} left!`);
}