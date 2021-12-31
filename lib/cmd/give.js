// Handle "give" Command
// # ----------------- #

const api = require('../../api');
const db = require('../../db');
const logic = require('../logic');

module.exports.sendGiveCardCommand = async function(interaction, user) {
    // GIVE: CARD
    // Step 1 - Validate User Argument
    const mentionedUser = interaction.options.getUser('user');
    if (mentionedUser.bot) {
        return interaction.reply(`**${mentionedUser.username}** is a bot and cannot have a Big Tuna account!`);
    } else if (mentionedUser.id === interaction.user.id) {
        return interaction.reply('You cannot give a card to yourself!');
    } else if (user.level < 20) {
        return interaction.reply(`You must reach **Lvl. 20** before accessing cards!`);
    }
    const otherUser = await db.users.fetchUser(mentionedUser.id);
    if (!otherUser) {
        return interaction.reply(`**${mentionedUser.username}** has not used Big Tuna before!`);
    } else if (otherUser.level < 20) {
        return interaction.reply(`**${mentionedUser.username}** is not **Lvl. 20** yet!`);
    }

    // Step 2 - Validate ID Argument/Ensure <10 Cards
    let cardId = interaction.options.getInteger('id');
    if (cardId <= 0) { return interaction.reply(`**${cardId}** is not a valid card ID!`); }
    const card = await db.cards.getCardByRelativeId(user.userid, cardId);
    if (!card) { return interaction.reply(`You don't own a card with ID **${cardId}**!`); }

    const userCards = await db.cards.getAllUserCards(otherUser.userid);
    if (userCards.length >= 10) {
        return interaction.reply(`**${mentionedUser.username}** already has **10 cards** in their inventory!`);
    }

    // Step 3 - Update Database
    await db.cards.setCardOwner(card.id, otherUser.userid);

    // Step 4 - Send Embed
    const FishData = api.fish.getFishData(card.fish);
    let embed = {
        color: logic.color.STATIC.give,
        title: `Success! Gave ${logic.text.capitalizeWords(FishData.name.replace(/_/g, ' '))} Card to ${mentionedUser.username}!`,
        author: {
            name: `${interaction.user.username}#${interaction.user.discriminator} (Lvl. ${user.level})`,
            icon_url: interaction.user.displayAvatarURL()
        }
    };

    interaction.reply({ embeds: [embed] });
}

module.exports.sendGiveRingCommand = async function(interaction, user) {
    // GIVE: RING
    // Step 1 - Validate User Argument
    const mentionedUser = interaction.options.getUser('user');
    if (mentionedUser.bot) {
        return interaction.reply(`**${mentionedUser.username}** is a bot and cannot have a Big Tuna account!`);
    } else if (mentionedUser.id === interaction.user.id) {
        return interaction.reply('You cannot give a ring to yourself!');
    } else if (user.level < 20) {
        return interaction.reply(`You must reach **Lvl. 20** before accessing rings!`);
    }
    const otherUser = await db.users.fetchUser(mentionedUser.id);
    if (!otherUser) {
        return interaction.reply(`**${mentionedUser.username}** has not used Big Tuna before!`);
    } else if (otherUser.level < 20) {
        return interaction.reply(`**${mentionedUser.username}** is not **Lvl. 20** yet!`);
    }

    // Step 2 - Validate ID Argument/Ensure <10 Rings
    let ringId = interaction.options.getInteger('id');
    if (ringId <= 0) { return interaction.reply(`**${ringId}** is not a valid ring ID!`); }
    const ring = await db.rings.getRingByRelativeId(user.userid, ringId);
    if (!ring) { return interaction.reply(`You don't own a ring with ID **${ringId}**!`); }

    const userRings = await db.rings.getAllUserRings(otherUser.userid);
    if (userRings.length >= 10) {
        return interaction.reply(`**${mentionedUser.username}** already has **10 rings** in their inventory!`);
    }

    // Step 3 - Update Database
    await db.rings.setRingOwner(ring.id, otherUser.userid);

    // Step 4 - Send Embed
    let embed = {
        color: logic.color.STATIC.give,
        title: `Success! Gave ${logic.text.capitalizeWords(ring.ring_type)} Ring to ${mentionedUser.username}!`,
        author: {
            name: `${interaction.user.username}#${interaction.user.discriminator} (Lvl. ${user.level})`,
            icon_url: interaction.user.displayAvatarURL()
        }
    };

    interaction.reply({ embeds: [embed] });
}