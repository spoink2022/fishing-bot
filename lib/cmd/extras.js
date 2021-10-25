const api = require('../../api');
const db = require('../../db');

const { millisToTimeString } = require('../misc/datetime.js');
const { createEmbed } = require("../misc/embed");

module.exports.c = {
    'vote': ['v'],
    'server': [],
    'redeem': [],
    'giftpremium': []
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
        case 'giftpremium':
            sendGiftPremium(msg, user);
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
    let pInfo = await db.users.getPurchases(msg.author.id);
    if (!pInfo || pInfo.custom_fish <= 0) {
        attemptReply(msg, 'You have not purchased this perk!\nPlease visit https://bigtuna.xyz/shop'); return;
    }
    // Carry out the transaction
    db.servers.setColumn(msg.guild.id, 'custom_fish_privilege', true);
    let remaining = await db.users.decrementCustomFish(msg.author.id);
    msg.channel.send(`Success! This server now has custom fish command privileges!\nYou now have **${remaining}** grant${remaining===1 ? '' : 's'} left!`);
}

async function sendGiftPremium(msg, user) {
    let pInfo = await db.users.getPurchases(msg.author.id);
    if (!pInfo || pInfo.one_week_host < 2) {
        attemptReply(msg, 'You don\'t have any supporter perks to gift!\n\nThese are available at https://bigtuna.xyz/shop if you\'re interested.');
        return;
    }

    let mentionedUser = await msg.mentions.users.first();
    if (!mentionedUser) {
        attemptReply(msg, 'Please mention the user you would like to gift supporter perks to!');
        return;
    } else if (mentionedUser.id === msg.author.id) {
        attemptReply(msg, 'You can\'t gift supporter perks to yourself!');
        return;
    }

    let mentionedUserAccount = await db.users.fetchUser(mentionedUser.id);
    if (!mentionedUserAccount) {
        attemptReply(msg, 'You may only gift supporter perks to Big Tuna Fishers!');
        return;
    }

    let options = {
        author: [`${msg.author.tag} (Lvl. ${user.level})`, msg.author.displayAvatarURL()],
        title: `Grant Big Big Tuna Supporter to ${mentionedUser.tag}?`,
        color: api.visuals.getColor('classic', 'classic'),
        description: `${mentionedUser} will receive supporter perks if you confirm.`
    }
    let embed = await createEmbed(options);
    msg.channel.send(embed).then(async (sentEmbed) => {
        await sentEmbed.react('✅');
        sentEmbed.react('❌');
        const filter = ( reaction, user ) => (reaction.emoji.name === '✅' || reaction.emoji.name === '❌') && user.id === msg.author.id;
        const collector = await sentEmbed.createReactionCollector(filter, { time: 10000 });
        collector.on('collect', async (reactionData) => {
            collector.stop();
            if (reactionData.emoji.name === '✅') {
                pInfo = await db.users.getPurchases(msg.author.id);
                if (pInfo.one_week_host < 2) {
                    attemptReply(msg, 'You do not have any more supporter perks to gift!');
                    return;
                }
                await db.users.updatePurchasesColumn(msg.author.id, 'one_week_host', -1);
                db.users.updatePurchasesColumn(mentionedUser.id, 'one_week_host', 1);
                var options = {
                    author: [`${msg.author.tag} (Lvl. ${user.level})`, msg.author.displayAvatarURL()],
                    title: 'Success!',
                    color: api.visuals.getColor('classic', 'success'),
                    description: `You gifted supporter perks to ${mentionedUser}.\nThey are now a **Big Big Tuna Supporter**!`
                }
            } else {
                var options = {
                    title: 'Canceled!',
                    color: api.visuals.getColor('classic', 'failure'),
                    description: `Supporter perks were not gifted.`
                }
            }
            let embed = await createEmbed(options);
            msg.channel.send(embed);
        });
        collector.on('end', async(collected, reason) => {
            if (reason === 'time') {
                let options = {
                    title: 'Timed Out!',
                    color: api.visuals.getColor('classic', 'failure'),
                    description: `Supporter perks were not gifted`
                };
                let embed = await createEmbed(options);
                msg.channel.send(embed);
            }
            sentEmbed.reactions.removeAll().catch((err) => {

            });
        });
    });
}