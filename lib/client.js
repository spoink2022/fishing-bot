const {Client, Intents} = require('discord.js');

const auth = require('../static/private/auth.json');
const db = require('../db');
const { beginAutoposting } = require('./autopost.js');
const { sendWelcomeMessage } = require('./misc/sender.js');

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
client.on('guildMemberAdd', onGuildMemberAdd);


async function onReady() {
    client.user.setPresence({activity: {type: 'WATCHING', name: `type .init to get started`}});
    console.log('Logged in as ' + client.user.tag + '!');
    if(auth.topggToken) { beginAutoposting(); }
}

async function onMessage(msg) {
    if(msg.author.bot) { return; }
    if(msg.content.startsWith(PREFIX)) {
        runCommand(msg);
    }
}

async function onGuildMemberAdd(guildMember) {
    let server = await db.servers.fetchServer(guildMember.guild.id);
    if (server.startinfo) {
        let user = await db.users.fetchUser(guildMember.user.id);
        if (!user) {
            sendWelcomeMessage(guildMember.id);
        }
    }
}

module.exports = client;