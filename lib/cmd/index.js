const db = require('../../db');

// NEW -- START
// order by alphabetical of file
const { sendAquariumCommand, sendAquariumsCommand, sendCollectCommand } = require('./aquarium.js');
const { sendBountyCommand } = require('./bounty.js');
const { sendBuyEquipmentCommand } = require('./buy.js');
const { sendCardCommand, sendCardsCommand } = require('./card.js');
const { sendClanCommandInteraction, sendClanCommandMessage } = require('./clan.js');
const { sendFishCommand } = require('./fish.js');
const { sendGiveRingCommand, sendGiveCardCommand, sendGiveSkinCommand, sendGiveSupporterCommand } = require('./give.js');
const { sendHelpCommand, sendQuickstartCommand } = require('./help.js');
const { sendInfoCommand } = require('./info.js');
const { sendLocationCommand, sendLocationsCommand, sendSetLocationCommand } = require('./location.js');
const { sendLeaderboardsCommand, sendFishLeaderboardsCommand } = require('./leaderboards.js');
const { sendVoteCommand, sendOptInCommnad, sendOptOutCommnad } = require('./misc.js');
const { sendBaitCommand, sendCooldownsCommand, sendEquipmentCommand } = require('./profile.js');
const { sendQuestCommand } = require('./quest.js');
const { sendRingCommand, sendRingsCommand } = require('./ring.js');
const { sendRedeemCommand, sendSetCustomFishCommand } = require('./servers.js');
const { sendShopBaitCommand, sendShopEquipmentCommand, sendShopRingsCommand } = require('./shop.js');
const { sendSkinCommand, sendSkinsCommand } = require('./skin.js');
const { sendPlayerStatsCommand, sendServerStatsCommand, sendGlobalStatsCommand } = require('./stats.js');
const { sendUpdatesCommand } = require('./updates.js');

module.exports.handleCommandInteraction = async function(interaction) {
    try {
        if (interaction.guild && !interaction.guild.me.permissionsIn(interaction.channel).has(['VIEW_CHANNEL', 'SEND_MESSAGES', 'ATTACH_FILES', 'USE_EXTERNAL_EMOJIS'])) {
            return interaction.reply(`**Big Tuna does not have the required permissions in this channel!**
Big Tuna requires \`View Channel\`, \`Send Messages\`, \`Attach Files\`, and \`Use External Emojis\` to operate!
\n(If this is something you see in every channel, try re-inviting Big Tuna).`);
        }
    } catch {
        return;
    }

    let user = await db.users.fetchUser(interaction.user.id);
    let locationId, mentionedUser, category, cardId, baitName, ringId, skinId, option, command;
    switch (interaction.commandName) {
        case 'aquarium':
            locationId = interaction.options.getInteger('location') || user.location;
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

        case 'updates':
            sendUpdatesCommand(interaction);
            break;

        default:
            break;
    }
}

module.exports.handleCommandMessage = async function(msg) {
    try {
        if (msg.guild && !msg.guild.me.permissionsIn(msg.channel).has(['VIEW_CHANNEL', 'SEND_MESSAGES', 'ATTACH_FILES', 'USE_EXTERNAL_EMOJIS'])) {
            return msg.reply(`**Big Tuna does not have the required permissions in this channel!**
Big Tuna requires \`View Channel\`, \`Send Messages\`, \`Attach Files\`, and \`Use External Emojis\` to operate!
\n(If this is something you see in every channel, try re-inviting Big Tuna).`);
        }
    } catch {
        return;
    }

    if (msg.content === '.f' || msg.content.startsWith('.f ')) { msg.content = msg.content.replace('.f', '.fish'); }
    else if (msg.content === '.c') { msg.content = '.collect'; }
    else if (msg.content === '.s' || msg.content.startsWith('.s ')) { msg.content = '.stats player'; }
    else if (msg.content === '.cd') { msg.content = '.cooldowns'; }
    else if (msg.content.startsWith('.sl ')) { msg.content = msg.content.replace('.sl', '.setlocation'); }
    else if (msg.content === '.shop') { msg.content = '.shop equipment'; }
    else if (msg.content === '.bs') { msg.content = '.shop bait'; }
    else if (msg.content === '.ca') { msg.content = '.clan campaign'; }
    else if (msg.content === '.m') { msg.content = '.clan members'; }
    else if (msg.content.startsWith('.li ')) { msg.content = msg.content.replace('.li', '.location'); }
    else if (msg.content === '.q' || msg.content.startsWith('.q ')) { msg.content = msg.content.replace('.q', '.quest'); }
    else if (msg.content === '.ss') { msg.content = '.stats server'; }
    else if (msg.content.startsWith('.fi ')) { msg.content = msg.content.replace('.fi', '.info'); }
    else if (msg.content.startsWith('.ii ')) { msg.content = msg.content.replace('.ii', '.info'); }
    else if (msg.content === '.lb') { msg.content = '.leaderboards kg'; }
    else if (msg.content === '.b') { msg.content = '.bait'; }
    else if (msg.content === '.clan') { msg.content = '.clan profile'; }
    else if (msg.content === '.e' || msg.content.startsWith('.e ')) { msg.content = '.equipment'; }

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
            locationId = args[0] || user.location;
            sendAquariumCommand(msg, user, locationId, mentionedUser || msg.author);
            break;

        case 'aquariums':
            mentionedUser = msg.mentions.users.first() || msg.author;
            sendAquariumsCommand(msg, user, mentionedUser);
            break;

        case 'collect':
            sendCollectCommand(msg, user);
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
            switch (args[0]) {
                case 'bait':
                    sendShopBaitCommand(msg, user);
                    break;
                case 'equipment':
                    sendShopEquipmentCommand(msg, user);
                    break;
                case 'rings':
                    sendShopRingsCommand(msg, user);
                    break;
                default:
                    break;
            }
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

        case 'updates':
            sendUpdatesCommand(msg);
            break;

        default:
            break;
    }
}
// NEW -- END