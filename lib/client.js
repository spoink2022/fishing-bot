const {Client, Intents} = require('discord.js');

const auth = require('../static/private/auth.json');

const runCommand = require('./cmd');
const { sendInfo } = require('./cmd/info');

const intents = new Intents([
    Intents.NON_PRIVILEGED,
    "GUILD_MEMBERS",
]);

const client = new Client({ws: {intents}});
//let client = new Client();
client.login(auth.discordToken);
client.on('ready', onReady);
client.on('message', onMessage);


async function onReady() {
    client.user.setActivity(`for pings`, {type: 'WATCHING'});
    console.log('Logged in as ' + client.user.tag + '!');
}

async function onMessage(msg) {
    if(!msg.author.bot && msg.content.startsWith(PREFIX)) {
        runCommand(msg);
    } else if(msg.mentions.members && msg.mentions.members.first() && msg.mentions.members.first().user.id === '813091581896425523') {
        sendInfo(msg, true);
    }
}

module.exports = client;