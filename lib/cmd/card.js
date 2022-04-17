// Handle "card", "cards" Commands
// # --------------------------- #

const { MessageAttachment, MessageActionRow, MessageButton } = require('discord.js');

const api = require('../../api');
const db = require('../../db');
const logic = require('../logic');

const { calculateCardValue, calculateFisherScore, calculateFishWeight } = require('../misc/calculations.js');
const { createCardCanvas } = require('../misc/canvas.js');
const { sendReply } = require('../misc/reply.js');

const GRADES = ['trophy', 'sashimi', 'premium', 'consumer'];
const GRADE_EMOJIS = [':trophy:', ':sushi:', ':fried_shrimp:', ':rock:'];
const SIZE_CLASSES = ['small', 'medium', 'large', 'extra large'];

module.exports.sendCardCommand = async function(interaction, user, cardId, mentionedUser) {
    // CARD
    // Step 1 - Validate User Argument
    let USER_MENTIONED = false;
    if (mentionedUser && mentionedUser.id !== interaction.user.id) {
        USER_MENTIONED = true;
        if (mentionedUser.bot) {
            return sendReply(interaction, `**${mentionedUser.username}** is a bot and cannot have a Big Tuna account!`);
        }
        user = await db.users.fetchUser(mentionedUser.id);
        if (!user) {
            return sendReply(interaction, `**${mentionedUser.username}** has not used Big Tuna before!`);
        } else if (!user.opted_in) {
            return sendReply(interaction, `**${mentionedUser.username}** is not opted in! They must use the \`/optin\` command to make their stats publicy visible.`);
        } else if (user.level < 20) {
            return sendReply(interaction, `**${mentionedUser.username}** is not **Lvl. 20** yet!`);
        }
    }
    if (user.level < 20) {
        return sendReply(interaction, `You must reach **Lvl. 20** before accessing cards!`);
    }

    // Step 2 - Validate ID Argument
    if (!cardId && cardId !== 0) { return sendReply(interaction, 'You must provide the ID of a card!'); } // For text-based command calls
    if (cardId <= 0) { return sendReply(interaction, `**${cardId}** is not a valid card ID!`); }

    const card = await db.cards.getCardByRelativeId(user.userid, cardId);
    if (!card) {
        if (USER_MENTIONED) { return sendReply(interaction, `**${mentionedUser.username}** does not own a card with ID **${cardId}**!`); }
        return sendReply(interaction, `You don't own a card with ID **${cardId}**!`); 
    }

    // Step 3 - Construct Variables
    const FishData = api.fish.getFishData(card.fish);
    const weight = calculateFishWeight(card.r, FishData);
    const cardValue = calculateCardValue(card);

    // Step 4 - Render Canvas
    const canvasBuffer = await createCardCanvas(card);
    const attachment = new MessageAttachment(canvasBuffer, `card_${card.id}.png`);

    // Step 5 - Send Embed
    let embed = {
        color: logic.color.STATIC[GRADES[card.grade - 1]],
        title: `Card - ${logic.text.capitalizeWords(FishData.name.replace(/_/g, ' '))}`,
        author: {
            name: `${mentionedUser.tag} (Lvl. ${user.level})`,
            icon_url: mentionedUser.displayAvatarURL()
        },
        description: `:globe_with_meridians: Global Card ID: **${card.id}**
:dart: Relative ID: ${cardId} \`/card ${cardId}\`
\n:sparkles: Meat Quality: **${logic.text.capitalizeWords(GRADES[card.grade - 1])} Grade** *(#${card.grade})*
:fish: Species: **${logic.text.capitalizeWords(FishData.name.replace(/_/g, ' '))}**
:mag: Class: **${logic.text.capitalizeWords(SIZE_CLASSES[FishData.sizeClass - 1])}**
:scales: Weight: **${logic.text.kgToWeight(weight)} (${logic.text.rToTier(card.r)})**
:moneybag: Sell Price: **${cardValue}** :lollipop:`,
        image: {
            url: `attachment://card_${card.id}.png`
        }
    };

    let rowArr = [];
    let clan;
    if (!USER_MENTIONED) {
        const redeemable = card.r > (await db.aquarium.getFish(user.userid, [FishData.name]))[FishData.name];
        redeemButton = new MessageButton().setCustomId(`${interaction.id} redeem`).setLabel('Redeem to Aquarium').setStyle('SUCCESS').setDisabled(!redeemable);
        sellButton = new MessageButton().setCustomId(`${interaction.id} sell`).setLabel('Sell').setStyle('SECONDARY');
        rowArr = [new MessageActionRow().addComponents(redeemButton, sellButton)];

        clan = await db.clan.fetchClanByUserid(user.userid);
        if (clan) {
            const timeElapsed = Date.now() - parseInt(clan.boat_start_time);
            const PropellerData = api.clan.getPropellerData(clan.propeller);
            const boatIdle = timeElapsed >= PropellerData.cooldown + 86400000;
            rowArr.push(new MessageActionRow().addComponents(
                new MessageButton().setCustomId(`${interaction.id} upgrade`).setLabel(`Upgrade ${['Hull', 'Container', 'Engine', 'Propeller'][card.grade - 1]}`).setStyle('PRIMARY').setDisabled(!boatIdle),
                new MessageButton().setCustomId(`${interaction.id} fuel`).setLabel('Convert to Fuel').setStyle('PRIMARY').setDisabled(!boatIdle)
            ));
        }
    }

    sendReply(interaction, { embeds: [embed], files: [attachment], components: rowArr }).then(async (sentMessage) => {
        const filter = i => i.customId.split(' ')[0] === interaction.id;

        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 20000 });

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) { return i.reply({ content: 'That button is not for you!', ephemeral: true }); }
            collector.stop();

            const action = i.customId.split(' ')[1];
            let embed2;
            if (action === 'redeem') {
                embed2 = await handleRedeemButton(user, card);
            } else if (action === 'sell') {
                embed2 = await handleSellButton(user, card);
            } else if (action === 'upgrade') {
                embed2 = await handleUpgradeButton(user, card);
            } else if (action === 'fuel') {
                embed2 = await handleFuelButton(user, card);
            }
            await i.update({ embeds: [embed, embed2], components: [] });
        });

        collector.on('end', (collected, reason) => {
            if (reason === 'time') {
                if (interaction.constructor.name === 'Message') { return sentMessage.edit({ embeds: [embed], components: [] }); }
                interaction.editReply({ embeds: [embed], components: [] });
            }
        });
    });
}
async function handleRedeemButton(user, card) {
    // Check if user does NOT have the card anymore
    user = await db.users.fetchUser(user.userid);
    card = await db.cards.getCard(card.id);
    if (!card || user.userid !== card.userid) {
        return {
            color: logic.color.STATIC.failure,
            title: 'You no longer own this card!',
            description: 'Action cancelled!'
        };
    }
    // Check if card is no longer redeemable
    const FishData = api.fish.getFishData(card.fish);
    const redeemable = card.r > (await db.aquarium.getFish(user.userid, [FishData.name]))[FishData.name];
    if (!redeemable) {
        return {
            color: logic.color.STATIC.failure,
            title: 'Redeeming this card would no longer improve your aquarium!',
            description: 'Action cancelled!'
        }
    }
    // Update Database
    await db.aquarium.setColumn(user.userid, FishData.name, card.r);
    await db.cards.removeCard(card.id);
    // Update Fisher Score
    const AllFishData = api.fish.getFishDataFromLocation(FishData.location);
    db.aquarium.getFish(user.userid, AllFishData.map(obj => obj.name)).then(allFish => {
        const locationScore = calculateFisherScore(allFish, AllFishData);
        db.scores.setLocationScore(user.userid, FishData.location, locationScore).then(() => {
            db.scores.updateOverallScore(user.userid);
        });
    });
    // Return Embed
    return {
        color: logic.color.STATIC[GRADES[card.grade - 1]],
        title: `Redeemed Card to Aquarium!`,
        description: `Your personal best **${FishData.name.replace(/_/g, ' ')}** has been updated!`
    };
}
async function handleSellButton(user, card) {
    // Check if user does NOT have the card anymore
    user = await db.users.fetchUser(user.userid);
    card = await db.cards.getCard(card.id);
    if (!card || user.userid !== card.userid) {
        return {
            color: logic.color.STATIC.failure,
            title: 'You no longer own this card!',
            description: 'Action cancelled!'
        };
    }
    // Update Database
    const cardValue = calculateCardValue(card);
    await db.cards.removeCard(card.id);
    await db.users.updateColumns(user.userid, { lollipops: cardValue });
    // Return Embed
    return {
        color: logic.color.STATIC[GRADES[card.grade - 1]],
        title: `Sold Card!`,
        description: `You now have ${user.lollipops + cardValue} :lollipop:`
    };
}
async function handleUpgradeButton(user, card) {
    // Check if user does NOT have the card anymore
    user = await db.users.fetchUser(user.userid);
    card = await db.cards.getCard(card.id);
    if (!card || user.userid !== card.userid) {
        return {
            color: logic.color.STATIC.failure,
            title: 'You no longer own this card!',
            description: 'Action cancelled!'
        };
    }
    // Re-check if boat is on trip
    const clan = await db.clan.fetchClanByUserid(user.userid);
    if (!clan) {
        return {
            color: logic.color.STATIC.failure,
            title: 'You are no longer in a clan!',
            description: 'Action cancelled!'
        };
    }
    const timeElapsed = Date.now() - parseInt(clan.boat_start_time);
    const PropellerData = api.clan.getPropellerData(clan.propeller);
    const boatIdle = timeElapsed >= PropellerData.cooldown + 86400000;
    if (!boatIdle) {
        return {
            color: logic.color.STATIC.failure,
            title: 'Your Clan Boat is currently in use!',
            description: 'Action cancelled'
        };
    }
    // Check if equipment is max level
    let NextEquipmentData;
    const equipmentType = ['hull', 'container', 'engine', 'propeller'][card.grade - 1];
    if (card.grade === 1) { NextEquipmentData = api.clan.getHullData(clan.hull + 1); }
    else if (card.grade === 2) { NextEquipmentData = api.clan.getContainerData(clan.container + 1); }
    else if (card.grade === 3) { NextEquipmentData = api.clan.getEngineData(clan.engine + 1); }
    else if (card.grade === 4) { NextEquipmentData = api.clan.getPropellerData(clan.propeller + 1); }
    if (!NextEquipmentData) {
        return {
            color: logic.color.STATIC.failure,
            title: `Your Clan Boat ${logic.text.capitalizeWords(equipmentType)} is already at max level!`,
            description: 'Action cancelled'
        };
    }

    // Handle level-ups
    const cardValue = calculateCardValue(card);
    let newProgress = clan[`${equipmentType}_progress`] + cardValue;
    let newLevel = clan[`${equipmentType}`];
    let levelUpStr = '';
    if (newProgress >= NextEquipmentData.price) {
        newProgress -= NextEquipmentData.price;
        newLevel++;
        levelUpStr = `\nLeveled up to **${NextEquipmentData.name} ${equipmentType}**!`;
    }
    // Update Database
    let instructions = {};
    instructions[`${equipmentType}_progress`] = newProgress;
    instructions[equipmentType] = newLevel;
    await db.clan.setClanColumns(clan.id, instructions);
    await db.cards.removeCard(card.id);
    db.clan.updateMemberColumn(user.userid, 'boat_contribution', cardValue);
    
    // Return Embed
    return {
        color: logic.color.STATIC[GRADES[card.grade - 1]],
        title: `Upgraded Clan Boat ${logic.text.capitalizeWords(equipmentType)}!`,
        description: `+${cardValue} to ${equipmentType} ${api.emoji[`CLANBOAT_${equipmentType.toUpperCase()}`]}` + levelUpStr
    };
}
async function handleFuelButton(user, card) {
    // Check if user does NOT have the card anymore
    user = await db.users.fetchUser(user.userid);
    card = await db.cards.getCard(card.id);
    if (!card || user.userid !== card.userid) {
        return {
            color: logic.color.STATIC.failure,
            title: 'You no longer own this card!',
            description: 'Action cancelled!'
        };
    }
     // Re-check if boat is on trip
     const clan = await db.clan.fetchClanByUserid(user.userid);
     if (!clan) {
         return {
             color: logic.color.STATIC.failure,
             title: 'You are no longer in a clan!',
             description: 'Action cancelled!'
         };
     }
     const timeElapsed = Date.now() - parseInt(clan.boat_start_time);
     const PropellerData = api.clan.getPropellerData(clan.propeller);
     const boatIdle = timeElapsed >= PropellerData.cooldown + 86400000;
     if (!boatIdle) {
         return {
             color: logic.color.STATIC.failure,
             title: 'Your Clan Boat is currently in use!',
             description: 'Action cancelled'
         };
     }
    // Update Database
    const cardValue = calculateCardValue(card);
    await db.cards.removeCard(card.id);
    await db.clan.updateClanColumns(clan.id, { fuel: cardValue });
    db.clan.updateMemberColumn(user.userid, 'boat_contribution', cardValue);
    // Return Embed
    return {
        color: logic.color.STATIC[GRADES[card.grade - 1]],
        title: `Converted to Clan Boat Fuel!`,
        description: `+${cardValue} Fuel :oil:`
    };
}


module.exports.sendCardsCommand = async function(interaction, user, mentionedUser) {
    // CARDS
    // Step 1 - Validate User Argument
    let USER_MENTIONED = false;
    if (mentionedUser && mentionedUser.id !== interaction.user.id) {
        USER_MENTIONED = true;
        if (mentionedUser.bot) {
            return sendReply(interaction, `**${mentionedUser.username}** is a bot and cannot have a Big Tuna account!`);
        }
        user = await db.users.fetchUser(mentionedUser.id);
        if (!user) {
            return sendReply(interaction, `**${mentionedUser.username}** has not used Big Tuna before!`);
        } else if (!user.opted_in) {
            return sendReply(interaction, `**${mentionedUser.username}** is not opted in! They must use the \`/optin\` command to make their stats publicy visible.`);
        } else if (user.level < 20) {
            return sendReply(interaction, `**${mentionedUser.username}** is not **Lvl. 20** yet!`);
        }
    }
    if (user.level < 20) {
        return sendReply(interaction, `You must reach **Lvl. 20** before accessing cards!`);
    }

    // Step 2 - Construct Variables
    const cards = await db.cards.getAllUserCards(user.userid);
    const FishNames = api.fish.getFishNames();

    // Step 3 - Send Embed
    let embed = {
        color: logic.color.byPurchase(user),
        title: `Fish Cards (${cards.length}/10)`,
        author: {
            name: `${mentionedUser.tag} (Lvl. ${user.level})`,
            icon_url: mentionedUser.displayAvatarURL()
        },
        description: cards.map((card, i) => {
            return `\`${i+1}\` ${GRADE_EMOJIS[card.grade - 1]} **${logic.text.capitalizeWords(FishNames[card.fish].replace(/_/g, ' '))}** (${logic.text.rToTier(card.r)})`;
        }).join('\n') + `\n\nCombined Value: ${cards.reduce((a, b) => a + calculateCardValue(b), 0)} :lollipop:`
    };

    sendReply(interaction, { embeds: [embed] });
}