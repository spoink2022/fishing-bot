const api = require('../../api');
const db = require('../../db');
const { createEmbed } = require('../misc/embed.js');
const gameLogic = require('../misc/game_logic.js');

const ACCEPTED_EVENT_TYPES = ['golden_fish'];

async function attemptReply(msg, str) {
    if(msg.channel.type === 'dm') { msg.channel.send(str); }
    else { msg.reply(str); }
}

module.exports = async function(msg) {
    let cmd = msg.content.split(' ')[1] || '';
    let args = msg.content.substring(cmd.length + PREFIX.length + 7).toLowerCase().split(' ');
    if(cmd === 'setevent') {
        sendSetEvent(msg, args);
    } else if(cmd === 'date') {
        msg.channel.send(`${Date.now()} - ${new Date().getHours()}hrs, ${new Date().getMinutes()}m`);
    } else if(cmd === 'generate') {
        sendGenerate(msg, args);
    } else if(cmd === 'check') {
        sendCheck(msg, args);
    } else if(cmd === 'help_setevent') {
        sendHelpSetEvent(msg, args);
    } else {
        attemptReply(msg, `${msg.author.username}, that's not a valid admin command!`);
    }
}

async function sendSetEvent(msg, args) {
    if(args.length !== 5) {
        msg.channel.send('There should be 5 arguments!');
    } else if(!ACCEPTED_EVENT_TYPES.includes(args[0])) {
        msg.channel.send(`${args[0]} is not an accepted event type.\n\`Accepted: ${ACCEPTED_EVENT_TYPES.join(', ')}\``);
    } else if(!parseInt(args[2]) || !parseInt(args[3])) {
        msg.channel.send(`One of \`${args[2]}\` or \`${args[3]}\` is not an integer!`);
    } else {
        const eventInput = {
            type: args[0],
            params: args[1],
            start_time: parseInt(args[2]),
            end_time: parseInt(args[3]),
            description: args[4].replace(/_/g, ' '),
            create_time: Date.now()
        };
        let options = {
            color: api.visuals.getColor('admin', '1'),
            title: 'Set a golden fish event?',
            description: eventInput.description
        };
        let embed = await createEmbed(options);
        msg.channel.send(embed).then(async(sentEmbed) => {
            await sentEmbed.react('✔️');
            const filter = ( reaction, user ) => reaction.emoji.name === '✔️' && user.id === msg.author.id;
            const collector = sentEmbed.createReactionCollector(filter, { time: 10000 });
            collector.on('collect', async() => {
                collector.stop();
                await db.events.setEvent(eventInput);
                let embed = await createEmbed({
                    color: api.visuals.getColor('admin', '1'),
                    title: 'Event Successfully Setup!'
                });
                msg.channel.send(embed);
            });
            collector.on('end', async() => {
                if(msg.channel.type != 'dm') { sentEmbed.reactions.removeAll(); }
            });
        });
    }
}

async function sendGenerate(msg, args) {
    if (!args[0]) {
        msg.reply('The `generate` command expects a parameter!\nTry `baitshop`');
        return;
    }

    if (args[0] === 'baitshop') {
        sendGenerateBaitShop(msg, args);
    }
}

async function sendGenerateBaitShop(msg, args) {
    const TIMES_TO_RUN = 10;
    let latestEntry = await db.baitShop.getLatestEntry();
    for (let i=0; i<TIMES_TO_RUN; i++) {
        const startTime = latestEntry.end_time + i * (1000*60*60*24);
        const shopObj = gameLogic.generateBaitShop(startTime);
        await db.baitShop.insertEntry(shopObj);
    }
    msg.reply(`Successfully generated ${TIMES_TO_RUN} entries!`);
}

async function sendCheck(msg, args) {
    if (!args[0]) {
        msg.reply('The `check` command expects a parameter!\nTry `baitshop`');
        return
    }

    if(args[0] === 'baitshop') {
        sendCheckBaitShop(msg, args);
    }
}

async function sendCheckBaitShop(msg, args) {
    let latestEntry = await db.baitShop.getLatestEntry();
    msg.channel.send(`The latest entry in the baitshop is \`${latestEntry.date_string}\``);
}

async function sendHelpSetEvent(msg, args) {
    if(!args[0]) {
        msg.channel.send(`Usage: \`.setevent <type> <params_sep_by_underscores> <start_time> <end_time> <description>\``);
    }
}