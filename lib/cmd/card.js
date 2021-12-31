// Handle "card", "cards" Commands
// # --------------------------- #

const { MessageAttachment, MessageActionRow, MessageButton } = require('discord.js');

const api = require('../../api');
const db = require('../../db');
const logic = require('../logic');

const { calculateCardValue, calculateFishWeight } = require('../misc/calculations.js');
const { createCardCanvas } = require('../misc/canvas.js');

const GRADES = ['trophy', 'sashimi', 'premium', 'consumer'];
const SIZE_CLASSES = ['small', 'medium', 'large', 'extra large'];

module.exports.sendCardCommand = async function(interaction, user) {
    // CARD
    // Step 1 - Validate User Argument
    let USER_MENTIONED = false;
    const mentionedUser = interaction.options.getUser('user') || interaction.user;
    if (mentionedUser && mentionedUser.id !== interaction.user.id) {
        USER_MENTIONED = true;
        if (mentionedUser.bot) {
            return interaction.reply(`**${mentionedUser.username}** is a bot and cannot have a Big Tuna account!`);
        }
        user = await db.users.fetchUser(mentionedUser.id);
        if (!user) {
            return interaction.reply(`**${mentionedUser.username}** has not used Big Tuna before!`);
        } else if (!user.opted_in) {
            return interaction.reply(`**${mentionedUser.username}** is not opted in! They must use the \`/optin\` command to make their stats publicy visible.`);
        } else if (user.level < 20) {
            return interaction.reply(`**${mentionedUser.username}** is not **Lvl. 20** yet!`);
        }
    }
    if (user.level < 20) {
        return interaction.reply(`You must reach **Lvl. 20** before accessing cards!`);
    }

    // Step 2 - Validate ID Argument
    let cardId = interaction.options.getInteger('id');
    if (cardId <= 0) { return interaction.reply(`**${cardId}** is not a valid card ID!`); }

    const card = await db.cards.getCardByRelativeId(user.userid, cardId);
    if (!card) {
        if (USER_MENTIONED) { return interaction.reply(`**${mentionedUser.username}** does not own a card with ID **${cardId}**!`); }
        return interaction.reply(`You don't own a card with ID **${cardId}**!`); 
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
            name: `${mentionedUser.username}#${mentionedUser.discriminator} (Lvl. ${user.level})`,
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
    if (!USER_MENTIONED) {
        const redeemable = card.r > (await db.aquarium.getFish(user.userid, [FishData.name]))[FishData.name];
        redeemButton = new MessageButton().setCustomId(`${interaction.id} redeem`).setLabel('Redeem').setStyle('SUCCESS').setDisabled(!redeemable);
        sellButton = new MessageButton().setCustomId(`${interaction.id} sell`).setLabel('Sell').setStyle('SECONDARY');
        rowArr = [new MessageActionRow().addComponents(redeemButton, sellButton)];
    }

    interaction.reply({ embeds: [embed], files: [attachment], components: rowArr }).then(async () => {
        const filter = i => i.customId.split(' ')[0] === interaction.id;

        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 20000 });

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) { return i.reply({ content: 'That button is not for you!', ephemeral: true }); }
            collector.stop();

            const action = i.customId.split(' ')[1];
            let embed2;
            if (action === 'redeem') {
                embed2 = await handleRedeemButton(user, card);
            } else {
                embed2 = await handleSellButton(user, card);
            }
            await i.update({ embeds: [embed, embed2], components: [] });
        });

        collector.on('end', (collected, reason) => {
            if (reason === 'time') {
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


module.exports.sendCardsCommand = async function(interaction, user) {
    interaction.reply('Cards (Plural)');
}