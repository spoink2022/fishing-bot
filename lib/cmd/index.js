const api = require('../../api');
const db = require('../../db');
const Profile = require('./profile');
const Game = require('./game.js');
const Info = require('./info.js');
const Extras = require('./extras.js');
const Mods = require('./mods.js');
const Clan = require('./clan.js');
const runAdminCommand = require('./admin.js');

const { runCheck } = require('../global/cooldown.js');

const cmdObjects = [Profile, Game, Info, Extras, Mods, Clan];

const validCommands = getValidCommands(cmdObjects);

function getValidCommands(objectList) {
    let finalList = []
    for(obj of objectList.map(obj => obj.c)) {
        for(const[key, val] of Object.entries(obj)) {
            finalList.push(key);
            finalList.push.apply(finalList, val);
        }
    }
    return finalList;
}

async function attemptReply(msg, str) {
    if(msg.channel.type === 'dm') { msg.channel.send(str); }
    else { msg.reply(str); }
}

module.exports = async function(msg, runHelp=false) {
    if(runHelp) {
        Info.sendInfo(msg);
        return;
    }
    let cmd = msg.content.split(' ')[0].substring(PREFIX.length).toLowerCase();
    if(validCommands.includes(cmd)) {
        let args = msg.content.substring(cmd.length + PREFIX.length + 1).toLowerCase().split(' ');
        let user = await db.users.fetchUser(msg.author.id);
        if(cmd === 'start' || cmd === 'init') {
            if (!user) {
                Profile.sendInit(msg);
            } else {
                attemptReply(msg, 'You already have an account!');
            }
            return;
        }
        const checkData = await runCheck(msg.author.id, msg.createdTimestamp); // returns [can_run_function, remaining_cooldown]
        if(!checkData[0]) {
            msg.channel.send(`You're messaging too fast! Please wait ${Math.round(checkData[1]/100, 1)/10}s`);
            return;
        }

        for(obj of cmdObjects) {
            for(const[key, val] of Object.entries(obj.c)) {
                if(key === cmd || val.includes(cmd)) {
                    if(user) {
                        obj.run(msg, key, args, user);
                    } else { // no account
                        msg.channel.send(`Please type \`.start\` in order to do commands!`);
                    }
                    break;
                }
            }
        }
    } else if(cmd.startsWith('admin')) {
        let user = await db.users.fetchUser(msg.author.id);
        if(user.premium === 2 || user.premium === 3) {
            runAdminCommand(msg);
        }
    }
}