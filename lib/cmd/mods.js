const api = require('../../api');
const db = require('../../db');
const { updateCustomFishLocals, removeFromCustomFishLocals } = require('../global/custom_fish.js');
const { createEmbed } = require('../misc/embed');

const ACCEPTED_PREFIXES = ['.', '!', '?', ',', '~', ';', 'f', '..', '??', '!!', 'f!', 't!']

async function attemptReply(msg, str) {
    if(msg.channel.type === 'dm') { msg.channel.send(str); }
    else { msg.reply(str); }
}

module.exports.c = {
    'toggle': ['t'],
    'setprefix': [],
    'setcustomfish': ['scf']
};

module.exports.run = async function(msg, cmd, args, user) {
    switch (cmd) {
        case 'toggle':
            sendToggle(msg, args);
            break;
        case 'setprefix':
            sendSetPrefix(msg, args);
            break;
        case 'setcustomfish':
            sendSetCustomFish(msg, args);
            break;
    }
}

async function sendToggle(msg, args) {
    if (msg.channel.type !== 'text') {
        msg.channel.send(`The \`${msg.prefix}toggle\` command can only be used in servers!`);
        return;
    }

    if (!msg.member.hasPermission('MANAGE_GUILD')) {
        msg.reply('You must have `Manage Server` permissions in order to use the `toggle` command');
        return;
    }

    let choice = args[0];

    if (!choice) {
        msg.reply('`.toggle <choice>` expects a parameter! A valid parameter is \`startinfo\`');
    } else {
        if (choice === 'startinfo') {
            toggleStartInfo(msg);
        } else {
            msg.reply(`\`${choice}\` is not a valid parameter. A valid parameter is \`startinfo\``);
        }
    }

}

async function toggleStartInfo(msg) {
    let newToggle = await db.servers.toggle(msg.guild.id, 'startinfo');
    let options = {
        color: api.visuals.getColor('cmd', 'mod'),
        author: [msg.author.tag, msg.author.displayAvatarURL()],
        title: `Toggled startinfo to ${newToggle.startinfo ? 'ON' : 'OFF'}`,
        description: newToggle.startinfo ? '**startinfo** functionality has been turned on\n\n- Upon joining, members who do not have a Big Tuna account will now be messaged a small start guide' : '**startinfo** functionality has been turned off',
        footer: 'Type ".toggle startinfo" to undo this action'
    }
    let embed = await createEmbed(options);
    msg.channel.send(embed);
}

async function sendSetPrefix(msg, args) {
    if (msg.channel.type !== 'text') {
        msg.channel.send(`This command can only be used in servers!`);
        return;
    }
    if (!msg.member.hasPermission('MANAGE_GUILD')) {
        msg.channel.send('You must have `Manage Server` permissions in order to use this command!');
        return;
    }
    if (!ACCEPTED_PREFIXES.includes(args[0])) {
        msg.channel.send(`You must specify a prefix from the set: \`${ACCEPTED_PREFIXES.join(' ')}\``);
        return;
    }
    await db.servers.setPrefix(msg.guild.id, args[0]);
    msg.reply(`Success! Big Tuna's prefix in this server is now \`${args[0]}\`\nIf you ever forget your prefix, just ping Big Tuna!`);
}

async function sendSetCustomFish(msg, args) {
    if (msg.channel.type === 'dm') {
        msg.channel.send('This command can only be used in servers!'); return;
    }
    if (!msg.member.hasPermission('MANAGE_GUILD')) {
        msg.channel.send('You must have `Manage Server` permissions in order to use this command!'); return;
    }
    let server = await db.servers.fetchServer(msg.guild.id);
    if (!server.custom_fish_privilege) {
        msg.channel.send('This server does not have the required privileges for this command!\nPlease visit the shop on our webpage and use the `.redeem` command to access this feature!'); return;
    }
    let customFishCommand = args.join(' ');
    if (!customFishCommand) {
        if (server.custom_fish) {
            db.servers.removeCustomFishCommand(msg.guild.id, customFishCommand);
            removeFromCustomFishLocals(msg.guild.id);
            attemptReply(msg, `\`${server.custom_fish}\` will no longer trigger fishing.`);
        } else {
            msg.channel.send('You must provide a string to map the command to!');
        }
        return;
    } else if (customFishCommand.length > 32) {
        msg.channel.send(`\`${customFishCommand}\` exceeds 32 characters!`); return;
    }

    db.servers.setCustomFishCommand(msg.guild.id, customFishCommand);
    updateCustomFishLocals(msg.guild.id, customFishCommand);

    attemptReply(msg, `\`${customFishCommand}\` will now trigger fishing!`);
}