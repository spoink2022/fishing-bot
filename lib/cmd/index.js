const { clientId } = require('../../private/config.json');

const db = require('../../db');

// NEW -- START
// order by alphabetical of file
const { sendAquariumCommand, sendAquariumsCommand, sendCollectCommand, sendScoresCommand } = require('./aquarium.js');
const { sendBountyCommand } = require('./bounty.js');
const { sendBuyEquipmentCommand } = require('./buy.js');
const { sendCardCommand, sendCardsCommand } = require('./card.js');
const { sendClanCommandInteraction, sendClanCommandMessage } = require('./clan.js');
const { sendFishCommand } = require('./fish.js');
const { sendGiveRingCommand, sendGiveCardCommand, sendGiveSkinCommand, sendGiveSupporterCommand } = require('./give.js');
const { sendHelpCommand, sendQuickstartCommand } = require('./help.js');
const { sendInfoCommand } = require('./info.js');
const { sendLocationCommand, sendLocationsCommand, sendSetLocationCommand } = require('./location.js');
const { sendLeaderboardsCommand, sendFishLeaderboardsCommand, sendRankingsCommand } = require('./leaderboards.js');
const { sendChumCommand, sendPrestigeCommand, sendVoteCommand } = require('./misc.js');
const { sendBaitCommand, sendCooldownsCommand, sendEquipmentCommand } = require('./profile.js');
const { sendQuestCommand } = require('./quest.js');
const { sendRingCommand, sendRingsCommand } = require('./ring.js');
const { sendAnnexCommand, sendServerShopsCommand, sendRedeemCommand, sendSetCustomFishCommand } = require('./servers.js');
const { sendSettingsCommand, sendToggleCommand } = require('./settings.js');
const { sendRevokeCommand, sendShopCommand, sendBaitShopCommand, sendServerShopCommand } = require('./shop.js');
const { sendSkinCommand, sendSkinsCommand } = require('./skin.js');
const { sendPlayerStatsCommand, sendServerStatsCommand, sendGlobalStatsCommand, sendContributionsCommand } = require('./stats.js');
const { sendUpdatesCommand, sendEventCommand } = require('./updates.js');

const { sendTutorialOne, getTutorialTwoEmbed, getTutorialThreeEmbed, getTutorialFourEmbed } = require('./tutorial.js');

const { sendReply } = require('../misc/reply.js');

const COMMAND_NAMES = [
    'aquarium',
    'aquariums',
    'collect',
    'scores',
    'bounty',
    'buy',
    'card',
    'cards',
    'clan',
    'fish',
    'give',
    'help',
    'quickstart',
    'info',
    'leaderboards',
    'fishleaderboards',
    'rankings',
    'location',
    'locations',
    'weather',
    'setlocation',
    'chum',
    'prestige',
    'vote',
    'bait',
    'cooldowns',
    'equipment',
    'quest',
    'ring',
    'rings',
    'annex',
    'redeem',
    'setcustomfish',
    'settings',
    'toggle',
    'shop',
    'baitshop',
    'servershop',
    'skin',
    'skins',
    'stats',
    'contributions',
    'updates',
    'event'
];


module.exports.handleCommandInteraction = async function(interaction) {
    /*return sendReply(interaction, 'Slash Commands have been temporarily disabled! Please use the \`.\` prefix!').catch(() => {
        console.log('command interaction');
    });*/

    if (interaction.guild && !interaction.guild.me.permissionsIn(interaction.channel).has(['VIEW_CHANNEL', 'SEND_MESSAGES', 'ATTACH_FILES', 'USE_EXTERNAL_EMOJIS', 'EMBED_LINKS', 'READ_MESSAGE_HISTORY'])) {
        return sendReply(interaction, { content: `**Big Tuna does not have the required permissions in this channel!**
Big Tuna requires \`View Channel\`, \`Send Messages\`, \`Attach Files\`, \`Embed Links\`, \`Read Message History\`, and \`Use External Emojis\` to operate!
\n(If this is something you see in every channel, try re-inviting Big Tuna or editing server permissions).` }).catch(() => {
            console.log('message (failed to reply)');
        });
    }

    await interaction.deferReply().catch(err => console.log('Error deferring reply!'));
    interaction.reply = interaction.editReply;

    let user = await db.users.fetchUser(interaction.user.id);

    // Check for bans
    if (user.banned) {
        let embed = {
            color: 0xff0000,
            title: `Account Locked`,
            author: {
                name: `${interaction.user.tag} (Lvl. ${user.level})`,
                icon_url: interaction.user.displayAvatarURL()
            },
            description: `You are unable to use Big Tuna commands until the suspension is lifted.
\n**Reason**\nSuspended account on suspicion of self-botting.
\n**Account Lock End Time**\nAugust 31st, 8:00pm EST
\n**False Accusation?**\nDM me (Huntail777#4311) about it and I'll look into it further. It's very possible that we captured your account by mistake so please take the time to do this if you did not actually use a self-bot.
\nJoin the [Community Server](https://discord.gg/RaN2VE9zpa) to be able to DM me.`
        };
        return sendReply(interaction, { embeds: [embed] });
    }
    
    if (user.tutorial === 0) {
        return sendTutorialOne(interaction, user);
    } else if (user.tutorial === 1 && interaction.commandName !== 'fish') {
        return sendTutorialOne(interaction, user);
    } else if (user.tutorial === 2 && (interaction.commandName !== 'stats' || interaction.options.getSubcommand() !== 'player')) {
        return sendReply(interaction, { embeds: [await getTutorialTwoEmbed(interaction, user)] });
    } else if (user.tutorial === 3 && interaction.commandName !== 'aquarium') {
        return sendReply(interaction, { embeds: [await getTutorialThreeEmbed(interaction, user)] });
    } else if (user.tutorial === 4 && interaction.commandName !== 'equipment') {
        return sendReply(interaction, { embeds: [await getTutorialFourEmbed(interaction, user)] });
    }

    let locationId, mentionedUser, category, cardId, baitName, ringId, skinId, option, command;
    switch (interaction.commandName) {
        case 'aquarium':
            locationId = interaction.options.getInteger('location') || null;
            mentionedUser = interaction.options.getUser('user') || interaction.user;
            sendAquariumCommand(interaction, user, locationId, mentionedUser);
            break;

        case 'aquariums':
            mentionedUser = interaction.options.getUser('user') || interaction.user;
            sendAquariumsCommand(interaction, user, mentionedUser);
            break; 

        case 'collect':
            sendCollectCommand(interaction, user);
            break;

        case 'scores':
            locationId = interaction.options.getInteger('location');
            mentionedUser = interaction.options.getUser('user') || interaction.user;
            sendScoresCommand(interaction, user, locationId, mentionedUser);
            break;

        case 'bounty':
            sendBountyCommand(interaction, user);
            break;

        case 'buy':
            category = interaction.options.getSubcommand();
            sendBuyEquipmentCommand(interaction, user, category);
            break;

        case 'card':
            cardId = interaction.options.getInteger('id');
            mentionedUser = interaction.options.getUser('user') || interaction.user;
            sendCardCommand(interaction, user, cardId, mentionedUser);
            break;

        case 'cards':
            mentionedUser = interaction.options.getUser('user') || interaction.user;
            sendCardsCommand(interaction, user, mentionedUser);
            break;

        case 'clan':
            sendClanCommandInteraction(interaction, user);
            break;

        case 'fish':
            baitName = interaction.options.getString('bait');
            sendFishCommand(interaction, user, baitName);
            break;

        case 'give':
            switch (interaction.options.getSubcommand()) {
                case 'card':
                    cardId = interaction.options.getInteger('id');
                    mentionedUser = interaction.options.getUser('user');
                    sendGiveCardCommand(interaction, user, cardId, mentionedUser);
                    break;
                case 'ring':
                    ringId = interaction.options.getInteger('id');
                    mentionedUser = interaction.options.getUser('user');
                    sendGiveRingCommand(interaction, user, ringId, mentionedUser);
                    break;
                case 'skin':
                    skinId = interaction.options.getString('id');
                    mentionedUser = interaction.options.getUser('user');
                    sendGiveSkinCommand(interaction, user, skinId, mentionedUser);
                    break;
                case 'supporter':
                    mentionedUser = interaction.options.getUser('user');
                    sendGiveSupporterCommand(interaction, user, mentionedUser);
                    break;
                default:
                    break;
            }
            break;

        case 'help':
            option = interaction.options.getString('option') || 'general';
            sendHelpCommand(interaction, user, option);
            break;

        case 'quickstart':
            sendQuickstartCommand(interaction, user);
            break;

        case 'info':
            option = interaction.options.getString('thing');
            sendInfoCommand(interaction, user, option);
            break;

        case 'leaderboards':
            category = interaction.options.getSubcommand();
            sendLeaderboardsCommand(interaction, user, category);
            break;

        case 'fishleaderboards':
            option = interaction.options.getString('fish');
            sendFishLeaderboardsCommand(interaction, user, option);
            break;
        
        case 'rankings':
            mentionedUser = interaction.options.getUser('user') || interaction.user;
            sendRankingsCommand(interaction, user, mentionedUser);
            break;

        case 'location':
            locationId = interaction.options.getInteger('id');
            sendLocationCommand(interaction, user, locationId);
            break;

        case 'locations':
            sendLocationsCommand(interaction, user);
            break;
        case 'weather':
            sendLocationsCommand(interaction, user);
            break;

        case 'setlocation':
            locationId = interaction.options.getInteger('id');
            sendSetLocationCommand(interaction, user, locationId);
            break;

        case 'chum':
            first = interaction.options.getString('first');
            second = interaction.options.getString('second');
            third = interaction.options.getString('third');
            fourth = interaction.options.getString('fourth');
            sendChumCommand(interaction, user, [first, second, third, fourth]);
            break;

        case 'prestige':
            sendPrestigeCommand(interaction, user);
            break;

        case 'vote':
            sendVoteCommand(interaction, user);
            break;

        case 'bait':
            sendBaitCommand(interaction, user);
            break;

        case 'cooldowns':
            sendCooldownsCommand(interaction, user);
            break;

        case 'equipment':
            mentionedUser = interaction.options.getUser('user') || interaction.user;
            sendEquipmentCommand(interaction, user, mentionedUser);
            break;

        case 'quest':
            mentionedUser = interaction.options.getUser('user') || interaction.user;
            sendQuestCommand(interaction, user, mentionedUser);
            break;

        case 'ring':
            ringId = interaction.options.getInteger('id');
            mentionedUser = interaction.options.getUser('user') || interaction.user;
            sendRingCommand(interaction, user, ringId, mentionedUser);
            break;

        case 'rings':
            mentionedUser = interaction.options.getUser('user') || interaction.user;
            sendRingsCommand(interaction, user, mentionedUser);
            break;

        case 'annex':
            sendAnnexCommand(interaction, user);
            break;

        case 'servershops':
            sendServerShopsCommand(interaction, user);
            break;

        case 'redeem':
            sendRedeemCommand(interaction, user);
            break;
        
        case 'setcustomfish':
            command = interaction.options.getString('word');
            sendSetCustomFishCommand(interaction, user, command);
            break;

        case 'settings':
            sendSettingsCommand(interaction, user);
            break;

        case 'toggle':
            const setting = interaction.options.getSubcommand();
            sendToggleCommand(interaction, user, setting);
            break;

        case 'shop':
            sendShopCommand(interaction, user);
            break;

        case 'baitshop':
            sendBaitShopCommand(interaction, user);
            break;

        case 'servershop':
            sendServerShopCommand(interaction, user);
            break;
        
        case 'skin':
            skinId = interaction.options.getString('id');
            sendSkinCommand(interaction, user, skinId);
            break;

        case 'skins':
            sendSkinsCommand(interaction, user);
            break;

        case 'stats':
            switch (interaction.options.getSubcommand()) {
                case 'player':
                    mentionedUser = interaction.options.getUser('user') || interaction.user;
                    sendPlayerStatsCommand(interaction, user, mentionedUser);
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
        
        case 'contributions':
            sendContributionsCommand(interaction, user);
            break;

        case 'updates':
            sendUpdatesCommand(interaction);
            break;

        case 'event':
            sendEventCommand(interaction);
            break;
        
        default:
            break;
    }
}

module.exports.handleCommandMessage = async function(msg) {
    if (msg.content.split(' ')[0].slice(1) === '') { return; } // stops bug where Big Tuna responds to all messages with tutorial instructions
    
    if (msg.guild && !msg.guild.me.permissionsIn(msg.channel).has(['VIEW_CHANNEL', 'SEND_MESSAGES', 'ATTACH_FILES', 'USE_EXTERNAL_EMOJIS', 'EMBED_LINKS', 'READ_MESSAGE_HISTORY'])) {
        return msg.channel.send({ content: `**Big Tuna does not have the required permissions in this channel!**
Big Tuna requires \`View Channel\`, \`Send Messages\`, \`Attach Files\`, \`Embed Links\`, \`Read Message History\`, and \`Use External Emojis\` to operate!
\n(If this is something you see in every channel, try re-inviting Big Tuna or editing server permissions).` }).catch(() => {
            console.log('message (failed to reply)');
        });
    }

    if (['GUILD_PUBLIC_THREAD', 'GUILD_PRIVATE_THREAD'].includes(msg.channel.type) && !msg.guild.me.permissionsIn(msg.channel).has(['SEND_MESSAGES_IN_THREADS'])) {
        return;
    }

    msg.content = await replaceShortcuts(msg.content);

    msg.user = msg.author; // for use within command functions
    msg.editReply = msg.edit;
    let cmd = msg.content.split(' ')[0].slice(1);
    let args = msg.content.split(' ').slice(1);
    let user = await db.users.fetchUser(msg.author.id);

    // Check for bans
    if (user.banned && COMMAND_NAMES.includes(cmd)) {
        let embed = {
            color: 0xff0000,
            title: `Account Locked`,
            author: {
                name: `${msg.user.tag} (Lvl. ${user.level})`,
                icon_url: msg.user.displayAvatarURL()
            },
            description: `You are unable to use Big Tuna commands until the suspension is lifted.
\n**Reason**\nSuspended account on suspicion of self-botting.
\n**Account Lock End Time**\nAugust 31st, 8:00pm EST
\n**False Accusation?**\nDM me (Huntail777#4311) about it and I'll look into it further. It's very possible that we captured your account by mistake so please take the time to do this if you did not actually use a self-bot.
\nJoin the [Community Server](https://discord.gg/RaN2VE9zpa) to be able to DM me.`
        };
        return sendReply(msg, { embeds: [embed] });
    }

    if (user.tutorial === 0) {
        return sendTutorialOne(msg, user);
    } else if (user.tutorial === 1 && cmd !== 'fish') {
        return sendTutorialOne(msg, user);
    } else if (user.tutorial === 2 && cmd !== 'stats' && cmd !== 's') {
        return sendReply(msg, { embeds: [await getTutorialTwoEmbed(msg, user)] });
    } else if (user.tutorial === 3 && cmd !== 'aquarium' && cmd !== 'a') {
        return sendReply(msg, { embeds: [await getTutorialThreeEmbed(msg, user)] });
    } else if (user.tutorial === 4 && cmd !== 'equipment' && cmd !== 'e') {
        return sendReply(msg, { embeds: [await getTutorialFourEmbed(msg, user)] });
    }

    let mentionedUser;
    if (msg.mentions.users.has(clientId)) {
        mentionedUser = msg.mentions.users.at(1);
    } else {
        mentionedUser = msg.mentions.users.first();
    }

    let locationId, category, cardId, baitName, ringId, skinId, option, command;
    switch (cmd) {
        case 'aquarium':
            if (mentionedUser) { args = args.slice(0, -1); } // Removes ping from argument list
            locationId = args[0] || null;
            sendAquariumCommand(msg, user, locationId, mentionedUser || msg.author);
            break;

        case 'aquariums':
            sendAquariumsCommand(msg, user, mentionedUser || msg.author);
            break;

        case 'collect':
            sendCollectCommand(msg, user);
            break;

        case 'scores':
            if (mentionedUser) { args = args.slice(0, -1); } // Removes ping from argument list
            locationId = args[0] || null;
            sendScoresCommand(msg, user, locationId, mentionedUser || msg.author);
            break;

        case 'bounty':
            sendBountyCommand(msg, user);
            break;

        case 'buy':
            category = args[0];
            sendBuyEquipmentCommand(msg, user, category);
            break;

        case 'card':
            if (mentionedUser) { args = args.slice(0, -1); } // Removes ping from argument list
            cardId = parseInt(args[0]);
            sendCardCommand(msg, user, cardId, mentionedUser || msg.author);
            break;

        case 'cards':
            sendCardsCommand(msg, user, mentionedUser || msg.author);
            break;

        case 'clan':
            sendClanCommandMessage(msg, user, mentionedUser);
            break;

        case 'fish':
            baitName = args[0] ? args.join(' ') : null;
            sendFishCommand(msg, user, baitName);
            break;

        case 'give':
            switch (args[0]) {
                case 'card':
                    cardId = args[1];
                    sendGiveCardCommand(msg, user, cardId, mentionedUser || msg.author);
                    break;
                case 'ring':
                    ringId = args[1];
                    sendGiveRingCommand(msg, user, ringId, mentionedUser || msg.author);
                    break;
                case 'skin':
                    skinId = args[1];
                    sendGiveSkinCommand(msg, user, skinId, mentionedUser || msg.author);
                    break;
                case 'supporter':
                    sendGiveSupporterCommand(msg, user, mentionedUser || msg.author);
                    break;
                default:
                    break;
            }
            break;

        case 'help':
            option = args[0] || 'general';
            sendHelpCommand(msg, user, option);
            break;

        case 'quickstart':
            sendQuickstartCommand(msg, user);
            break;

        case 'info':
            option = args[0] ? args.join(' ') : null;
            sendInfoCommand(msg, user, option);
            break;

        case 'leaderboards':
            category = args[0];
            sendLeaderboardsCommand(msg, user, category);
            break;

        case 'fishleaderboards':
            option = args[0] ? args.join(' ') : null;
            sendFishLeaderboardsCommand(msg, user, option);
            break;

        case 'rankings':
            sendRankingsCommand(msg, user, mentionedUser || msg.author);
            break;

        case 'location':
            locationId = parseInt(args[0]);
            sendLocationCommand(msg, user, locationId);
            break;

        case 'locations':
            sendLocationsCommand(msg, user);
            break;
        case 'weather':
            sendLocationsCommand(msg, user);
            break;

        case 'setlocation':
            locationId = parseInt(args[0]);
            sendSetLocationCommand(msg, user, locationId);
            break;

        case 'chum':
            baits = args;
            sendChumCommand(msg, user, baits);
            break;

        case 'prestige':
            sendPrestigeCommand(msg, user);
            break;

        case 'vote':
            sendVoteCommand(msg, user);
            break;

        case 'bait':
            sendBaitCommand(msg, user);
            break;

        case 'cooldowns':
            sendCooldownsCommand(msg, user);
            break;

        case 'equipment':
            sendEquipmentCommand(msg, user, mentionedUser || msg.author);
            break;

        case 'quest':
            sendQuestCommand(msg, user, mentionedUser || msg.author);
            break;

        case 'ring':
            if (mentionedUser) { args = args.slice(0, -1); } // Removes ping from argument list
            ringId = parseInt(args[0]);
            sendRingCommand(msg, user, ringId, mentionedUser || msg.author);
            break;

        case 'rings':
            sendRingsCommand(msg, user, mentionedUser || msg.author);
            break;

        case 'annex':
            sendAnnexCommand(msg, user);
            break;

        case 'servershops':
            sendServerShopsCommand(msg, user);
            break;

        case 'redeem':
            sendRedeemCommand(msg, user);
            break;
        
        case 'setcustomfish':
            command = args[0] ? args.join(' ') : null;
            sendSetCustomFishCommand(msg, user, command);
            break;

        case 'settings':
            sendSettingsCommand(msg, user);
            break;

        case 'toggle':
            const setting = args[0];
            sendToggleCommand(msg, user, setting);
            break;

        case 'shop':
            sendShopCommand(msg, user);
            break;

        case 'baitshop':
            sendBaitShopCommand(msg, user);
            break;

        case 'servershop':
            sendServerShopCommand(msg, user);
            break;
        
        case 'skin':
            skinId = args[0];
            sendSkinCommand(msg, user, skinId);
            break;

        case 'skins':
            sendSkinsCommand(msg, user);
            break;

        case 'stats':
            switch (args[0]) {
                case 'player':
                    sendPlayerStatsCommand(msg, user, mentionedUser || msg.author);
                    break;
                case 'server':
                    sendServerStatsCommand(msg);
                    break;
                case 'global':
                    sendGlobalStatsCommand(msg);
                    break;
                default:
                    break;
            }
            break;
        
        case 'contributions':
            sendContributionsCommand(msg, user);
            break;

        case 'updates':
            sendUpdatesCommand(msg);
            break;
        
        case 'event':
            sendEventCommand(msg);
            break;

        case 'revoke':
            sendRevokeCommand(msg);
            break;

        default:
            break;
    }
}
// NEW -- END
async function replaceShortcuts(content) {
    switch (content.split(' ')[0]) {
        case '.a':
            return content.replace('.a', '.aquarium');
        case '.c':
            return content.replace('.c', '.collect');
        case '.cd':
            return content.replace('.cd', '.cooldowns');
        case '.e':
            return content.replace('.e', '.equipment');
        case '.f':
            return content.replace('.f', '.fish');
        case '.li':
            return content.replace('.li', '.location');
        case '.q':
            return content.replace('.q', '.quest');
        case '.sl':
            return content.replace('.sl', '.setlocation');
        case '.s':
            return content.replace('.s', '.stats player');
        case '.stats':
            if (content === '.stats') { return content.replace('.stats', '.stats player'); }
            break;
        case '.ss':
            return content.replace('.ss', '.stats server');
        case '.v':
            return content.replace('.v', '.vote');
        case '.clan':
            if (content === '.clan') { return '.clan profile'; }
            else if (content.startsWith('.clan <@')) { return content.replace('.clan', '.clan profile'); }
            else if (content === '.clan password') { return '.clan password check'; }
            break;
        case '.ca':
            return content.replace('.ca', '.clan campaign');
        case '.campaign':
            return content.replace('.campaign', '.clan campaign');
        case '.m':
            return '.clan members';
        case '.ii':
            return content.replace('.ii', '.info');
        case '.fi':
            return content.replace('.fi', '.info');
        case '.lb':
            return content.replace('.lb', '.leaderboards');
        case '.bs':
            return content.replace('.bs', '.baitshop');
        case '.b':
            return content.replace('.b', '.bait');
        case '.flb':
            return content.replace('.flb', '.fishleaderboards');
        case '.w':
            return content.replace('.w', '.weather');
        case '.sshop':
            return content.replace('.sshop', '.servershop');
        case '.ranking':
            return content.replace('.ranking', '.rankings');
        case '.score':
            return content.replace('.score', '.scores');
        case '.boat':
            return content.replace('.boat', '.clan boat');
        case '.sss':
            return content.replace('.sss', '.servershops');
        default:
            return content;    
    }
    return content;
}