// Handle "give" Command
// # ----------------- #

const api = require('../../api');
const db = require('../../db');
const logic = require('../logic');

const { sendReply } = require('../misc/reply.js');

module.exports.sendGiveCardCommand = async function(interaction, user, cardId, mentionedUser) {
    // GIVE: CARD
    // Step 1 - Validate User Argument
    if (mentionedUser.bot) {
        return sendReply(interaction, `**${mentionedUser.username}** is a bot and cannot have a Big Tuna account!`);
    } else if (mentionedUser.id === interaction.user.id) {
        return sendReply(interaction, 'You cannot give a card to yourself!');
    } else if (user.level < 20) {
        return sendReply(interaction, `You must reach **Lvl. 20** before accessing cards!`);
    }
    const otherUser = await db.users.fetchUser(mentionedUser.id);
    if (!otherUser) {
        return sendReply(interaction, `**${mentionedUser.username}** has not used Big Tuna before!`);
    } else if (otherUser.level < 20) {
        return sendReply(interaction, `**${mentionedUser.username}** is not **Lvl. 20** yet!`);
    }

    // Step 2 - Validate ID Argument/Ensure <10 Cards
    if (!cardId) { return sendReply(interaction, 'You must specify the ID of the card to give!'); } // text-based command calls
    if (cardId <= 0) { return sendReply(interaction, `**${cardId}** is not a valid card ID!`); }
    const card = await db.cards.getCardByRelativeId(user.userid, cardId);
    if (!card) { return sendReply(interaction, `You don't own a card with ID **${cardId}**!`); }

    const userCards = await db.cards.getAllUserCards(otherUser.userid);
    const clan = await db.clan.fetchClanByUserid(otherUser.userid);
    const cardStorage = 10 + logic.clan.getCardStorageBonus(clan);
    if (userCards.length >= cardStorage) {
        return sendReply(interaction, `**${mentionedUser.username}** already has **${cardStorage} cards** in their inventory!`);
    }

    // Step 3 - Update Database
    await db.cards.setCardOwner(card.id, otherUser.userid);

    // Step 4 - Send Embed
    const FishData = api.fish.getFishData(card.fish);
    let embed = {
        color: logic.color.STATIC.success,
        title: `Success! Gave ${logic.text.capitalizeWords(FishData.name.replace(/_/g, ' '))} Card to ${mentionedUser.username}!`,
        author: {
            name: `${interaction.user.tag} (Lvl. ${user.level})`,
            icon_url: interaction.user.displayAvatarURL()
        }
    };

    sendReply(interaction, { embeds: [embed] });
}

module.exports.sendGiveRingCommand = async function(interaction, user, ringId, mentionedUser) {
    // GIVE: RING
    // Step 1 - Validate User Argument
    if (mentionedUser.bot) {
        return sendReply(interaction, `**${mentionedUser.username}** is a bot and cannot have a Big Tuna account!`);
    } else if (mentionedUser.id === interaction.user.id) {
        return sendReply(interaction, 'You cannot give a ring to yourself!');
    } else if (user.level < 20) {
        return sendReply(interaction, `You must reach **Lvl. 20** before accessing rings!`);
    }
    const otherUser = await db.users.fetchUser(mentionedUser.id);
    if (!otherUser) {
        return sendReply(interaction, `**${mentionedUser.username}** has not used Big Tuna before!`);
    } else if (otherUser.level < 20) {
        return sendReply(interaction, `**${mentionedUser.username}** is not **Lvl. 20** yet!`);
    }

    // Step 2 - Validate ID Argument/Ensure <10 Rings
    if (!ringId)  { return sendReply(interaction, 'You must specify the ID of the ring to give!'); } // text-based command calls
    if (ringId <= 0) { return sendReply(interaction, `**${ringId}** is not a valid ring ID!`); }
    const ring = await db.rings.getRingByRelativeId(user.userid, ringId);
    if (!ring) { return sendReply(interaction, `You don't own a ring with ID **${ringId}**!`); }
    if (ring.id == user.ring) { return sendReply(interaction, 'You cannot give a ring that you have equipped!'); }

    const clanMember = await db.clan.fetchMember(user.userid);
    if (clanMember && ring.id == clanMember.boat_ring) { return sendReply(interaction, 'You cannot give a ring that you have equipped on the clan boat!'); }

    const userRings = await db.rings.getAllUserRings(otherUser.userid);
    if (userRings.length >= 10) {
        return sendReply(interaction, `**${mentionedUser.username}** already has **10 rings** in their inventory!`);
    }

    // Step 3 - Update Database
    await db.rings.setRingOwner(ring.id, otherUser.userid);

    // Step 4 - Send Embed
    let embed = {
        color: logic.color.STATIC.success,
        title: `Success! Gave ${logic.text.capitalizeWords(ring.ring_type)} Ring to ${mentionedUser.username}!`,
        author: {
            name: `${interaction.user.tag} (Lvl. ${user.level})`,
            icon_url: interaction.user.displayAvatarURL()
        }
    };

    sendReply(interaction, { embeds: [embed] });
}

module.exports.sendGiveSkinCommand = async function(interaction, user, skinId, mentionedUser) {
    const CATEGORY_MAP = { 'A': 0, 'B': 1 };
    const CATEGORY_ARR = ['equipment_banner', 'clan_avatar'];
    // GIVE: SKIN
    // Step 1 - Validate User Argument
    if (mentionedUser.bot) {
        return sendReply(interaction, `**${mentionedUser.username}** is a bot and cannot have a Big Tuna account!`);
    } else if (mentionedUser.id === interaction.user.id) {
        return sendReply(interaction, 'You cannot give a skin to yourself!');
    }
    const otherUser = await db.users.fetchUser(mentionedUser.id);
    if (!otherUser) {
        return sendReply(interaction, `**${mentionedUser.username}** has not used Big Tuna before!`);
    }

    // Step 2 - Validate ID Argument/Ensure <10 Skins
    if (!skinId) { return sendReply(interaction, 'You must specify the ID of the skin to give!'); } // text-based command calls
    skinId = skinId.toUpperCase();
    const number = skinId.slice(0, -1);
    const categoryId = CATEGORY_MAP[skinId.slice(-1)];
    if (categoryId === undefined || parseInt(number) != number) { return sendReply(interaction, `**${skinId}** is not a valid skin id! Use\`/skins\` to view your skins.`); }
    const skin = await db.skins.getSkinByRelativeId(user.userid, categoryId, parseInt(number));
    if (!skin) { return sendReply(interaction, `You have no skin with id **${skinId}**! Use\`/skins\` to view your skins.`); }

    const CategoryData = api.skins.getCategoryData(CATEGORY_ARR[categoryId]);
    const SkinData = CategoryData.contents[skin.cosmetic_id];
    const userSkins = await db.skins.getAllSkinsOfCategory(otherUser.userid, categoryId);
    if (userSkins.length >= 10) { return sendReply(interaction, `**${mentionedUser.username}** already has **10 ${CategoryData.name.toLowerCase()}**!`); }

    // Step 3 - Update Database
    await db.skins.setSkinOwner(skin.id, otherUser.userid);

    // Step 4 - Send Embed
    let embed = {
        color: logic.color.STATIC.success,
        title: `Success! Gave Skin "${SkinData.name}" to ${mentionedUser.username}!`,
        author: {
            name: `${interaction.user.tag} (Lvl. ${user.level})`,
            icon_url: interaction.user.displayAvatarURL()
        }
    };

    sendReply(interaction, { embeds: [embed] });
}

module.exports.sendGiveSupporterCommand = async function(interaction, user, mentionedUser) {
    // GIVE: SUPPORTER
    // Step 1 - Validate User Argument
    if (mentionedUser.bot) {
        return sendReply(interaction, `**${mentionedUser.username}** is a bot and cannot have a Big Tuna account!`);
    } else if (mentionedUser.id === interaction.user.id) {
        return sendReply(interaction, 'You cannot give premium to yourself!');
    }
    const otherUser = await db.users.fetchUser(mentionedUser.id);
    if (!otherUser) {
        return sendReply(interaction, `**${mentionedUser.username}** has not used Big Tuna before!`);
    }
    
    // Step 2 - Validate Has Premium
    if (user.big_supporter <= 1) { return sendReply(interaction, 'You must have at least 1 extra Big Supporter to gift them!'); }

    // Step 3 - Update Database
    await db.users.updateColumns(user.userid, { big_supporter: -1 });
    await db.users.updateColumns(otherUser.userid, { big_supporter: 1 });
    
    // Step 4 - Send Embed
    let embed = {
        color: logic.color.STATIC.trophy,
        title: `Gave Big Supporter to ${mentionedUser.tag}!`
    };
    sendReply(interaction, { embeds: [embed] });
}