const {Client, Intents} = require('discord.js');

const auth = require('../static/private/auth.json');
const db = require('../db');
const { beginAutoposting } = require('./autopost.js');
const { sendWelcomeMessage } = require('./misc/sender.js');
const { createEmbed } = require('./misc/embed.js');

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
    client.user.setPresence({activity: {type: 'PLAYING', name: `ping me for instructions`}});
    console.log('Logged in as ' + client.user.tag + '!');
    if(auth.topggToken) { beginAutoposting(); }
}

async function onMessage(msg) {
    if(msg.author.bot) { return; }
    if(msg.content.startsWith(PREFIX)) {
        runCommand(msg);
    } else if (msg.mentions.has(client.user.id)) {
        let options = {
            color: '#327fa2',
            description: `:fish: __**Your fishing journey starts here!**__ :fish:\
            \n:small_blue_diamond: Catch over 110 unique fish species, each with unique stats and weight ranges :moneybag:\
            \n\n:small_blue_diamond: Showcase your most impressive catches in your aquarium :truck:\
            \n:small_blue_diamond: Earn COINS from those aquariums :money_mouth:\
            \n\n:small_blue_diamond: Upgrade your equipment :fishing_pole_and_fish:\
            \n\n:small_blue_diamond: Compete with your friends and other servers :sunglasses:\
            \n:small_blue_diamond: Become the best fisher of all time! :medal:\
            \n\nStill not convinced? *Visit our [Official Website](https://bigtuna.xyz)*\
            \n\nReady to start? Just type \`${PREFIX}start\`\
            \nAlready have an account? Type \`${PREFIX}help\`\
            \n\n*A hands-on start guide is available at [bigtuna.xyz/start](https://bigtuna.xyz/start)*`
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