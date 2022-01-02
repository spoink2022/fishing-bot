const db = require('../../db');
//const Profile = require('./profile');
const Game = require('./game.js');
const Info = require('./info.js');
const Extras = require('./extras.js');
const Mods = require('./mods.js');
const Clan = require('./clan.js');
const runAdminCommand = require('./admin.js');

const { createEmbed } = require('../misc/embed.js');

const { runCheck } = require('../global/cooldown.js');

const cmdObjects = [Game, Info, Extras, Mods];

const validCommands = getValidCommands(cmdObjects);

// NEW -- START
// order by alphabetical of file
const { sendAquariumCommand, sendAquariumsCommand, sendCollectCommand } = require('./aquarium.js');
const { sendBountyCommand } = require('./bounty.js');
const { sendBuyEquipmentCommand } = require('./buy.js');
const { sendCardCommand, sendCardsCommand } = require('./card.js');
const { sendClanCommand } = require('./clan.js');
const { sendFishCommand } = require('./fish.js');
const { sendGiveRingCommand, sendGiveCardCommand } = require('./give.js');
const { sendLocationCommand, sendLocationsCommand, sendSetLocationCommand } = require('./location.js');
const { sendLeaderboardsCommand } = require('./leaderboards.js');
const { sendVoteCommand } = require('./misc.js');
const { sendBaitCommand, sendEquipmentCommand } = require('./profile.js');
const { sendQuestCommand } = require('./quest.js');
const { sendRingCommand, sendRingsCommand } = require('./ring.js');
const { sendShopBaitCommand, sendShopEquipmentCommand, sendShopRingsCommand } = require('./shop.js');
const { sendPlayerStatsCommand, sendServerStatsCommand, sendGlobalStatsCommand } = require('./stats.js');

module.exports.handleCommandInteraction = async function(interaction) {
    let user = await db.users.fetchUser(interaction.user.id);
    switch (interaction.commandName) {
        case 'aquarium':
            sendAquariumCommand(interaction, user);
            break;

        case 'aquariums':
            sendAquariumsCommand(interaction, user);
            break; 

        case 'collect':
            sendCollectCommand(interaction, user);
            break;

        case 'bounty':
            sendBountyCommand(interaction, user);
            break;

        case 'buy':
            sendBuyEquipmentCommand(interaction, user);
            break;

        case 'card':
            sendCardCommand(interaction, user);
            break;

        case 'cards':
            sendCardsCommand(interaction, user);
            break;

        case 'clan':
            sendClanCommand(interaction, user);
            break;

        case 'fish':
            sendFishCommand(interaction, user);
            break;

        case 'give':
            switch (interaction.options.getSubcommand()) {
                case 'card':
                    sendGiveCardCommand(interaction, user);
                    break;
                case 'ring':
                    sendGiveRingCommand(interaction, user);
                    break;
                default:
                    break;
            }
            break;

        case 'leaderboards':
            sendLeaderboardsCommand(interaction, user);
            break;

        case 'location':
            sendLocationCommand(interaction, user);
            break;

        case 'locations':
            sendLocationsCommand(interaction, user);
            break;
        case 'weather':
            sendLocationsCommand(interaction, user);
            break;

        case 'setlocation':
            sendSetLocationCommand(interaction, user);
            break;

        case 'vote':
            sendVoteCommand(interaction, user);
            break;

        case 'bait':
            sendBaitCommand(interaction, user);
            break;

        case 'equipment':
            sendEquipmentCommand(interaction, user);
            break;

        case 'quest':
            sendQuestCommand(interaction, user);
            break;

        case 'ring':
            sendRingCommand(interaction, user);
            break;

        case 'rings':
            sendRingsCommand(interaction, user);
            break;

        case 'shop':
            switch (interaction.options.getSubcommand()) {
                case 'bait':
                    sendShopBaitCommand(interaction, user);
                    break;
                case 'equipment':
                    sendShopEquipmentCommand(interaction, user);
                    break;
                case 'rings':
                    sendShopRingsCommand(interaction, user);
                    break;
                default:
                    break;
            }
            break;

        case 'stats':
            switch (interaction.options.getSubcommand()) {
                case 'player':
                    sendPlayerStatsCommand(interaction, user);
                    break;
                case 'server':
                    sendServerStatsCommand(interaction);
                    break;
                case 'global':
                    sendGlobalStatsCommand(interaction);
                    break;
                default:
                    break;
            }
            break;

        default:
            break;
    }
}

// NEW -- END

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

module.exports.runCommand = async function(msg, runHelp=false) {
    if(runHelp) {
        Info.sendInfo(msg);
        return;
    }
    let cmd = msg.content.split(' ')[0].substring(msg.prefix.length).toLowerCase();
    if(validCommands.includes(cmd)) {
        let args = msg.content.substring(cmd.length + msg.prefix.length + 1).toLowerCase().split(' ');
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
                    return;
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