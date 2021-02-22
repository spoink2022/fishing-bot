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
    if(msg.author.bot) { return; }
    if(msg.content.startsWith(PREFIX)) {
        runCommand(msg);
    } else if(msg.channel.type === 'text' && msg.mentions.members && msg.mentions.members.first() && msg.mentions.members.first().user.id === client.user.id) {
        sendInfo(msg, true);
    } else if(msg.channel.type === 'dm' && msg.mentions && msg.mentions.users.first().id === client.user.id) {
        sendInfo(msg, true);
    }
}

module.exports = client;