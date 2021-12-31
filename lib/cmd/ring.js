// Handle "ring" Command
// # ----------------- #

const { MessageAttachment, MessageActionRow, MessageButton } = require('discord.js');

const api = require('../../api');
const db = require('../../db');
const logic = require('../logic');

const { getRingAverages } = require('../misc/calculations.js');
const { createItemRingCanvas } = require('../misc/canvas.js');

module.exports.sendRingCommand = async function(interaction, user) {
    // RING
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
        return interaction.reply(`You must reach **Lvl. 20** before accessing rings!`);
    }

    // Step 2 - Validate ID Argument
    let ringId = interaction.options.getInteger('id');
    if (ringId <= 0) { return interaction.reply(`**${ringId}** is not a valid ring ID!`); }

    const ring = await db.rings.getRingByRelativeId(user.userid, ringId);
    if (!ring) {
        if (USER_MENTIONED) { return interaction.reply(`**${mentionedUser.username}** does not own a ring with ID **${ringId}**!`); }
        return interaction.reply(`You don't own a ring with ID **${ringId}**!`);
    }

    // Step 3 - Construct Variables
    const RingData = api.equipment.getRingData(ring.ring_type);
    const consumerChance = 100 - ring.premium - ring.sashimi - ring.trophy;

    // Step 4 - Render Canvas
    const canvasBuffer = await createItemRingCanvas(ring.ring_type);
    const attachment = new MessageAttachment(canvasBuffer, `${ring.ring_type}_ring.png`);

    // Step 5 - Send Embed
    let abilityDescription = '';
    const SIZE_CLASSES = ['small', 'medium', 'large', 'extra large'];
    const GRADES = ['consumer', 'premium', 'sashimi', 'trophy'];
    for (let i=0; i<4; i++) {
        if (RingData.classBoost[i] > 0) { abilityDescription += `\n+${RingData.classBoost[i]}% card drops from **${SIZE_CLASSES[i]}** fish.`; }
    }
    for (let i=0; i<3; i++) {
        if (RingData.gradeBoost[i] > 0) { abilityDescription += `\n${RingData.gradeBoost[i]}% of **${GRADES[i]} grade** cards convert to **${GRADES[i+1]} grade**.`; }
    }

    let embed = {
        color: logic.color.byPurchase(user),
        title: `${logic.text.capitalizeWords(ring.ring_type)} Ring`,
        author: {
            name: `${mentionedUser.username}#${mentionedUser.discriminator} (Lvl. ${user.level})`,
            icon_url: mentionedUser.displayAvatarURL()
        },
        description: `:globe_with_meridians: Global Ring ID: ${ring.id}
:dart: Relative ID: ${ringId} \`/ring ${ringId}${USER_MENTIONED ? ` @${mentionedUser.username}` : ''}\`
\n:coin: Sell Price: ${ring.value} Coins
${ring.id == user.ring ? ':white_check_mark:' : ':no_entry_sign: Not'} Equipped`,
        fields: [
            { 
                name: 'Card Drop Rates',
                value: `${api.emoji.SIZE_S} Small: ${ring.s}%\n${api.emoji.SIZE_M} Medium: ${ring.m}%\n${api.emoji.SIZE_L} Large: ${ring.l}%\n${api.emoji.SIZE_XL} Extra Large: ${ring.xl}%`,
                inline: true 
            },
            {
                name: 'Card Quality Chances',
                value: `:rock: Consumer: ${consumerChance}%\n:fried_shrimp: Premium: ${ring.premium}%\n:sushi: Sashimi: ${ring.sashimi}%\n:trophy: Trophy: ${ring.trophy}%`,
                inline: true
            },
            {
                name: 'Ability',
                value: abilityDescription,
                inline: false
            }
        ],
        image: {
            url: `attachment://${ring.ring_type}_ring.png`
        }
    };

    let equipButton, sellButton, row;
    if (!USER_MENTIONED) {
        equipButton = new MessageButton().setCustomId(`${interaction.id} equip`).setLabel('Equip').setStyle('SUCCESS');
        sellButton = new MessageButton().setCustomId(`${interaction.id} sell`).setLabel('Sell').setStyle('SECONDARY');
        if (ring.id == user.ring) {
            equipButton.setDisabled(true);
            sellButton.setDisabled(true);
        }
        row = new MessageActionRow().addComponents(equipButton, sellButton);
    }

    interaction.reply({ embeds: [embed], files: [attachment], components: !USER_MENTIONED ? [row] : [] }).then(async () => {
        const filter = i => i.customId.split(' ')[0] === interaction.id;

        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 20000 });

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) {
                return i.reply({ content: 'That button is not for you!', ephemeral: true });
            }
            collector.stop();

            const action = i.customId.split(' ')[1];
            let embed2;
            if (action === 'equip') {
                embed2 = await handleEquipButton(user, ring);
            } else {
                embed2 = await handleSellButton(user, ring);
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

async function handleEquipButton(user, ring) {
    // Check if user does NOT have the ring anymore
    user = await db.users.fetchUser(user.userid);
    ring = await db.rings.getRing(ring.id);
    if (!ring || user.userid !== ring.userid) {
        return {
            color: logic.color.STATIC.failure,
            title: 'You no longer own this ring!',
            description: 'Action cancelled!'
        };
    }
    // Check if user already equipped
    if (user.ring == ring.id) {
        return {
            color: logic.color.STATIC.failure,
            title: 'You already have this ring equipped!',
            description: 'Action cancelled!'
        }
    }
    // Update database & send embed
    await db.users.setColumns(user.userid, { ring: ring.id });
    return {
        color: logic.color.byPurchase(user),
        title: `Equipped the ${logic.text.capitalizeWords(ring.ring_type)} Ring!`
    };
}

async function handleSellButton(user, ring) {
    // Check if user does NOT have the ring anymore
    user = await db.users.fetchUser(user.userid);
    ring = await db.rings.getRing(ring.id);
    if (!ring || user.userid !== ring.userid) {
        return {
            color: logic.color.STATIC.failure,
            title: 'You no longer own this ring!',
            description: 'Action cancelled!'
        };
    }
    // Check if user has equipped
    if (user.ring == ring.id) {
        return {
            color: logic.color.STATIC.failure,
            title: 'You cannot sell a ring that you have equipped!',
            description: 'Action cancelled!'
        }
    }
    // Update database & send embed
    db.users.updateColumns(user.userid, { coins: ring.value });
    await db.rings.removeRing(ring.id);
    return {
        color: logic.color.byPurchase(user),
        title: `Sold the ${logic.text.capitalizeWords(ring.ring_type)} Ring for ${ring.value} Coins!`,
        description: `You now have ${user.coins + ring.value} coins!`
    };
}

module.exports.sendRingsCommand = async function(interaction, user) {
    // RINGS
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
        return interaction.reply(`You must reach **Lvl. 20** before accessing rings!`);
    }

    // Step 2 - Construct Variables
    const rings = await db.rings.getAllUserRings(user.userid);

    // Step 3 - Send Embed
    let embedFields = [];
    for (let i=0; i<rings.length; i++) {
        const ringAverages = getRingAverages(rings[i]);
        embedFields.push({
            name: `\`${i+1}\` ${logic.text.capitalizeWords(rings[i].ring_type)} Ring ${rings[i].id == user.ring ? ':white_check_mark:' : ''}`,
            value: `avg chance: ${ringAverages.chance}%
avg quality: x${ringAverages.mult}`,
            inline: true
        });
    }
    if (embedFields.length % 3 === 2) {
        embedFields.push({ name: '\u200b', value: '\u200b', inline: true });
    }

    let embed = {
        color: logic.color.byPurchase(user),
        title: `Rings (${rings.length}/10)`,
        author: {
            name: `${mentionedUser.username}#${mentionedUser.discriminator} (Lvl. ${user.level})`,
            icon_url: mentionedUser.displayAvatarURL()
        },
        description: `**Avg Chance**\nThe overall chance of dropping a card (ability included).
\n**Avg Quality**\nThe overall quest points multiplier from better card quality (ability included).
\n*View individual rings with \`/ring [ID]${USER_MENTIONED ? ` @${mentionedUser.username}` : ''}\`.*`,
        fields: embedFields
    }
    interaction.reply({ embeds: [embed] });
}