// Handle "ring" Command
// # ----------------- #

const { MessageAttachment } = require('discord.js');

const api = require('../../api');
const db = require('../../db');
const logic = require('../logic');

const { createItemRingCanvas } = require('../misc/canvas.js');

module.exports.sendRingCommand = async function(interaction, user) {
    // RING
    // Step 1 - Validate User Argument
    const mentionedUser = interaction.options.getUser('user') || interaction.user;
    if (mentionedUser && mentionedUser.id !== interaction.user.id) {
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

    // Step 2 - Validate Id Argument
    let ringId = interaction.options.getInteger('id');
    if (ringId <= 0) { return interaction.reply(`**${ringId}** is not a valid ring ID!`); }

    const ring = await db.rings.getRingByRelativeId(user.userid, ringId);
    if (!ring) {
        if (mentionedUser.id === interaction.user.id) { return interaction.reply(`You don't own a ring with ID **${ringId}**!`); }
        else { return interaction.reply(`**${mentionedUser.username}** does not own a ring with ID **${ringId}**!`); }
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
:dart: Relative ID: ${ringId} \`/ring ${ringId}\`
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
    interaction.reply({ embeds: [embed], files: [attachment] });
}

module.exports.sendRingsCommand = async function(interaction, user) {
    interaction.reply('rings');
}