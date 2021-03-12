const {Client, Intents} = require('discord.js');

const auth = require('../static/private/auth.json');
const { beginAutoposting } = require('./autopost.js');

const runCommand = require('./cmd');

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
    client.user.setActivity(`type .init to get started`, {type: 'WATCHING'});
    console.log('Logged in as ' + client.user.tag + '!');
    if(auth.topggToken) { beginAutoposting(); }
}

async function onMessage(msg) {
    if(msg.author.bot) { return; }
    if(msg.content.startsWith(PREFIX)) {
        runCommand(msg);
    }
}

module.exports = client;