const api = require('../../api');
const db = require('../../db');

module.exports.c = {
    'stats': ['s', 'st']
};

module.exports.run = async function(msg, cmd, args, user) {
    if(cmd === 'init') { sendInit(msg); }
    else if(cmd === 'stats') { sendStats(msg, user); }
}

module.exports.sendInit = async function(msg) {
    db.users.initializeAccount(msg.author.id, function() {
        msg.reply('Yay');
    });
}

async function sendStats(msg, user) {
    let playerLevelInfo = api.playerdata.getPlayerLevelInfo(user.level);
    msg.reply(`You have ${user.coins} coins! :coin:\nYou have ${user.exp}/${playerLevelInfo.expRequired} exp! :star:\nLvl. ${user.level}`);
}