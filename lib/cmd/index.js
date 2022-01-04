const db = require('../../db');

// NEW -- START
// order by alphabetical of file
const { sendAquariumCommand, sendAquariumsCommand, sendCollectCommand } = require('./aquarium.js');
const { sendBountyCommand } = require('./bounty.js');
const { sendBuyEquipmentCommand } = require('./buy.js');
const { sendCardCommand, sendCardsCommand } = require('./card.js');
const { sendClanCommand } = require('./clan.js');
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
    let user = await db.users.fetchUser(interaction.user.id);
    let locationId, mentionedUser;
    switch (interaction.commandName) {
        case 'aquarium':
            locationId = interaction.options.getInteger('location') || user.location;
            mentionedUser = interaction.options.getUser('user') || interaction.user;
            sendAquariumCommand(interaction, user, interaction.user, locationId, mentionedUser);
            break;

        case 'aquariums':
            mentionedUser = interaction.options.getUser('user') || interaction.user;
            sendAquariumsCommand(interaction, user, interaction.user, mentionedUser);
            break; 

        case 'collect':
            sendCollectCommand(interaction, user, interaction.user);
            break;

        case 'bounty':
            sendBountyCommand(interaction, user, interaction.user);
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
                case 'skin':
                    sendGiveSkinCommand(interaction, user);
                    break;
                case 'supporter':
                    sendGiveSupporterCommand(interaction, user);
                    break;
                default:
                    break;
            }
            break;

        case 'help':
            sendHelpCommand(interaction, user);
            break;

        case 'quickstart':
            sendQuickstartCommand(interaction, user);
            break;

        case 'info':
            sendInfoCommand(interaction, user);
            break;

        case 'leaderboards':
            sendLeaderboardsCommand(interaction, user);
            break;

        case 'fishleaderboards':
            sendFishLeaderboardsCommand(interaction, user);
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

        case 'redeem':
            sendRedeemCommand(interaction, user);
            break;
        
        case 'setcustomfish':
            sendSetCustomFishCommand(interaction, user);
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
            sendSkinCommand(interaction, user);
            break;

        case 'skins':
            sendSkinsCommand(interaction, user);
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

        case 'updates':
            sendUpdatesCommand(interaction);
            break;

        default:
            break;
    }
}

module.exports.handleCommandMessage = async function(msg) {
    const cmd = msg.content.split(' ')[0].slice(1);
    const args = msg.content.split(' ').slice(1);
    let user = await db.users.fetchUser(msg.author.id);
    let locationId, mentionedUser;
    switch (cmd) {
        case 'aquarium':
            locationId = args[0] || user.location;
            mentionedUser = msg.mentions.users.first() || msg.author;
            sendAquariumCommand(msg, user, msg.author, locationId, mentionedUser);
            break;

        case 'aquariums':
            mentionedUser = msg.mentions.users.first() || msg.author;
            sendAquariumsCommand(msg, user, msg.author, mentionedUser);
            break;

        case 'collect':
            sendCollectCommand(msg, user, msg.author);
            break;

        case 'bounty':
            sendBountyCommand(msg, user, msg.author);
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
                case 'skin':
                    sendGiveSkinCommand(interaction, user);
                    break;
                case 'supporter':
                    sendGiveSupporterCommand(interaction, user);
                    break;
                default:
                    break;
            }
            break;

        case 'help':
            sendHelpCommand(interaction, user);
            break;

        case 'quickstart':
            sendQuickstartCommand(interaction, user);
            break;

        case 'info':
            sendInfoCommand(interaction, user);
            break;

        case 'leaderboards':
            sendLeaderboardsCommand(interaction, user);
            break;

        case 'fishleaderboards':
            sendFishLeaderboardsCommand(interaction, user);
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

        case 'redeem':
            sendRedeemCommand(interaction, user);
            break;
        
        case 'setcustomfish':
            sendSetCustomFishCommand(interaction, user);
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
            sendSkinCommand(interaction, user);
            break;

        case 'skins':
            sendSkinsCommand(interaction, user);
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

        case 'updates':
            sendUpdatesCommand(interaction);
            break;

        default:
            break;
    }
}
// NEW -- END