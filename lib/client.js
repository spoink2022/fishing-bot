const {Client, Intents} = require('discord.js');

const auth = require('../static/private/auth.json');
const db = require('../db');
const { beginAutoposting } = require('./autopost.js');
const { hasCustomFishCommand, getCustomFishCommand } = require('./global/custom_fish.js');
const { sendWelcomeMessage } = require('./misc/sender.js');
const { createEmbed } = require('./misc/embed.js');

const runCommand = require('./cmd');

const ACCEPTED_PREFIXES_1 = ['.', '!', '?', ',', '~', ';', 'f'];
const ACCEPTED_PREFIXES_2 = ['..', '??', '!!', 'f!', 't!'];

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
    client.user.setPresence({activity: {type: 'PLAYING', name: `ping me for instructions`}});
    console.log('Logged in as ' + client.user.tag + '!');
    if(auth.topggToken) { beginAutoposting(); }
}

async function hasValidPrefix(str) {
    return ACCEPTED_PREFIXES_1.includes(str[0]) || ACCEPTED_PREFIXES_2.includes(str.substring(0, 2)) || str.startsWith('${PREFIX}');
}
async function onMessage(msg) {
    if (msg.author.bot) { return; }

    if (msg.guild && await hasCustomFishCommand(msg.guild.id)) {
        let customFishCommand = await getCustomFishCommand(msg.guild.id);
        if (msg.content.toLowerCase().startsWith(customFishCommand)) {
            msg.content = msg.content.toLowerCase().replace(customFishCommand, '${PREFIX}fish');
        }
    }

    if (msg.channel.type === 'dm' || await hasValidPrefix(msg.content)) {
        msg.prefix = msg.channel.type === 'dm' ? '.' : (await db.servers.fetchServer(msg.guild.id)).prefix;
        msg.content = msg.content.replace('${PREFIX}', msg.prefix);
        if (msg.content.startsWith(msg.prefix)) {
            runCommand(msg);
        }
    } else if (msg.mentions.has(client.user.id, {ignoreRoles: true, ignoreEveryone: true})) {
        msg.prefix = msg.channel.type === 'dm' ? '.' : (await db.servers.fetchServer(msg.guild.id)).prefix;
        let options = {
            color: '#327fa2',
            title: 'Welcome to Big Tuna!',
            description: `**Here's what you can expect**\
            \n:small_blue_diamond: Catch **110+** unique fish species :fish:\
            \n:small_blue_diamond: Manage **9** different aquariums :truck:\
            \n:small_blue_diamond: Purchase **200+** pieces of equipment :fishing_pole_and_fish:\
            \n:small_blue_diamond: Compete with **1000+** other servers :sunglasses:\
            \n:small_blue_diamond: Join one of **100+** fishing clans :shield:\
            \n:small_blue_diamond: Make use of **30+** unique commands :scroll:\
            \n:small_blue_diamond: Become the **best** fisher of all time! :medal:\
            \n\nVisit our [Official Website](https://bigtuna.xyz) for information, a shop, and much more!\
            \n\nReady to start? Type \`${msg.prefix}start\`\
            \nAlready have an account? Type \`${msg.prefix}help\``
        };
        let embed = await createEmbed(options);
        msg.channel.send(embed);
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