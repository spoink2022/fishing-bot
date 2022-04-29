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
const { sendVoteCommand, sendOptInCommnad, sendOptOutCommnad } = require('./misc.js');
const { sendBaitCommand, sendCooldownsCommand, sendEquipmentCommand } = require('./profile.js');
const { sendQuestCommand } = require('./quest.js');
const { sendRingCommand, sendRingsCommand } = require('./ring.js');
const { sendRedeemCommand, sendSetCustomFishCommand } = require('./servers.js');
const { sendRevokeCommand, sendShopCommand, sendBaitShopCommand, sendServerShopCommand } = require('./shop.js');
const { sendSkinCommand, sendSkinsCommand } = require('./skin.js');
const { sendPlayerStatsCommand, sendServerStatsCommand, sendGlobalStatsCommand, sendContributionsCommand } = require('./stats.js');
const { sendUpdatesCommand } = require('./updates.js');

const { sendReply } = require('../misc/reply.js');

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

    await interaction.deferReply();
    interaction.reply = interaction.editReply;

    let user = await db.users.fetchUser(interaction.user.id);
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

        case 'vote':
            sendVoteCommand(interaction, user);
            break;

        case 'opt':
            if (interaction.options.getSubcommand() === 'in') { sendOptInCommnad(interaction, user); }
            else { sendOptOutCommnad(interaction, user); }
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

        case 'redeem':
            sendRedeemCommand(interaction, user);
            break;
        
        case 'setcustomfish':
            command = interaction.options.getString('word');
            sendSetCustomFishCommand(interaction, user, command);
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

        default:
            break;
    }
}

module.exports.handleCommandMessage = async function(msg) {
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
    const cmd = msg.content.split(' ')[0].slice(1);
    let args = msg.content.split(' ').slice(1);
    let user = await db.users.fetchUser(msg.author.id);
    let locationId, mentionedUser, category, cardId, baitName, ringId, skinId, option, command;
    switch (cmd) {
        case 'aquarium':
            mentionedUser = msg.mentions.users.first();
            if (mentionedUser) { args = args.slice(0, -1); } // Removes ping from argument list
            locationId = args[0] || null;
            sendAquariumCommand(msg, user, locationId, mentionedUser || msg.author);
            break;

        case 'aquariums':
            mentionedUser = msg.mentions.users.first() || msg.author;
            sendAquariumsCommand(msg, user, mentionedUser);
            break;

        case 'collect':
            sendCollectCommand(msg, user);
            break;

        case 'scores':
            mentionedUser = msg.mentions.users.first();
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
            mentionedUser = msg.mentions.users.first();
            if (mentionedUser) { args = args.slice(0, -1); } // Removes ping from argument list
            cardId = parseInt(args[0]);
            sendCardCommand(msg, user, cardId, mentionedUser || msg.author);
            break;

        case 'cards':
            mentionedUser = msg.mentions.users.first() || msg.author;
            sendCardsCommand(msg, user, mentionedUser);
            break;

        case 'clan':
            sendClanCommandMessage(msg, user);
            break;

        case 'fish':
            baitName = args[0] ? args.join(' ') : null;
            sendFishCommand(msg, user, baitName);
            break;

        case 'give':
            switch (args[0]) {
                case 'card':
                    cardId = args[1];
                    mentionedUser = msg.mentions.users.first() || msg.author;
                    sendGiveCardCommand(msg, user, cardId, mentionedUser);
                    break;
                case 'ring':
                    ringId = args[1];
                    mentionedUser = msg.mentions.users.first() || msg.author;
                    sendGiveRingCommand(msg, user, ringId, mentionedUser);
                    break;
                case 'skin':
                    skinId = args[1];
                    mentionedUser = msg.mentions.users.first() || msg.author;
                    sendGiveSkinCommand(msg, user, skinId, mentionedUser);
                    break;
                case 'supporter':
                    mentionedUser = msg.mentions.users.first() || msg.author;
                    sendGiveSupporterCommand(msg, user, mentionedUser);
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
            mentionedUser = msg.mentions.users.first() || msg.author;
            sendRankingsCommand(msg, user, mentionedUser);
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

        case 'vote':
            sendVoteCommand(msg, user);
            break;

        case 'opt':
            if (args[0] === 'in') { sendOptInCommnad(msg, user); }
            else if (args[0] === 'out') { sendOptOutCommnad(msg, user); }
            break;

        case 'bait':
            sendBaitCommand(msg, user);
            break;

        case 'cooldowns':
            sendCooldownsCommand(msg, user);
            break;

        case 'equipment':
            mentionedUser = msg.mentions.users.first() || msg.author;
            sendEquipmentCommand(msg, user, mentionedUser);
            break;

        case 'quest':
            mentionedUser = msg.mentions.users.first() || msg.author;
            sendQuestCommand(msg, user, mentionedUser);
            break;

        case 'ring':
            mentionedUser = msg.mentions.users.first();
            if (mentionedUser) { args = args.slice(0, -1); } // Removes ping from argument list
            ringId = parseInt(args[0]);
            sendRingCommand(msg, user, ringId, mentionedUser || msg.author);
            break;

        case 'rings':
            mentionedUser = msg.mentions.users.first() || msg.author;
            sendRingsCommand(msg, user, mentionedUser);
            break;

        case 'redeem':
            sendRedeemCommand(msg, user);
            break;
        
        case 'setcustomfish':
            command = args[0] ? args.join(' ') : null;
            sendSetCustomFishCommand(msg, user, command);
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
                    mentionedUser = msg.mentions.users.first() || msg.author;
                    sendPlayerStatsCommand(msg, user, mentionedUser);
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
        default:
            return content;    
    }
    return content;
}