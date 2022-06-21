// Login the Big Tuna Client
// # --------------------- #
const { Client, Intents } = require('discord.js');

const { discordToken } = require('../private/config.json');


const { handleCommandInteraction, handleCommandMessage } = require('./cmd/index.js');
const { registerCustomFishCommands, hasCustomFish, getCustomFish } = require('./global/custom_fish.js');

// Login Process
const myIntents = new Intents([
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MEMBERS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.DIRECT_MESSAGES
]);

const client = new Client({ intents: myIntents, partials: ['CHANNEL'] });

// Event Handler Declarations
client.on('ready', onReady);
client.on('messageCreate', onMessageCreate);
client.on('interactionCreate', onInteractionCreate);
client.login(discordToken);

async function onReady() {
    client.user.setActivity('fishers fish with /fish', { type: 'WATCHING' });
    console.log('Logged in as ' + client.user.tag + '!');
    registerCustomFishCommands();
}

// Interaction Handling
async function onInteractionCreate(interaction) {
    if (interaction.isCommand()) {
        handleCommandInteraction(interaction);
    }
}

async function onMessageCreate(msg) {
    if (msg.author.bot) { return; }

    if (msg.inGuild() && hasCustomFish(msg.guildId)) {
        const customFish = getCustomFish(msg.guildId);
        if (msg.content.toLowerCase().startsWith(customFish)) {
            msg.content = msg.content.toLowerCase().replace(customFish, '.fish');
            msg.customFishTweaked = true;
        }
    }

    if (msg.content.startsWith('.')) {
        handleCommandMessage(msg);
    }
}

module.exports = client;