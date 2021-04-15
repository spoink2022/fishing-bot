const api = require('../../api');
const db = require('../../db');
const { createEmbed } = require('../misc/embed');

module.exports.c = {
    'toggle': ['t']
};

module.exports.run = async function(msg, cmd, args, user) {
    if (cmd === 'toggle') {
        sendToggle(msg, args);
    }
}

async function sendToggle(msg, args) {
    if (msg.channel.type !== 'text') {
        msg.channel.send(`The \`${PREFIX}toggle\` command can only be used in servers!`);
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