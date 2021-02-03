const db = require('../../db');

module.exports.c = {
    'stats': ['s', 'st']
};

module.exports.run = async function(msg, cmd, args, user) {
    if(cmd === 'init') { sendInit(msg); }
    else if(cmd === 'stats') { sendStats(msg); }
}

module.exports.sendInit = async function(msg) {
    db.users.initializeAccount(msg.author.id, function() {
        msg.reply('Yay');
    });
}

async function sendStats(msg) {
    msg.reply('Here are your stats!');
}