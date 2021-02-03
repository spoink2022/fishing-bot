const api = require('../../api');
const db = require('../../db');
const Profile = require('./profile');
const Game = require('./game.js');

const cmdObjects = [Profile, Game];

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

module.exports = async function(msg) {
    let cmd = msg.content.split(' ')[0].substring(PREFIX.length).toLowerCase();
    if(validCommands.includes(cmd) || cmd === 'init') {
        let args = msg.content.substring(cmd.length + PREFIX.length + 1).toLowerCase().split(' ');
        let user = await db.users.fetchUser(msg.author.id);
        if(!user && cmd === 'init') {
            Profile.sendInit(msg);
            return;
        }
        for(obj of cmdObjects) {
            for(const[key, val] of Object.entries(obj.c)) {
                if(key === cmd || val.includes(cmd)) {
                    if(user) {
                        obj.run(msg, key, args, user);
                    } else { // no account
                        msg.channel.send(`You don't have an account yet!\n**Create one with** \`${PREFIX}init\``);
                    }
                    break;
                }
            }
        }
    }
}