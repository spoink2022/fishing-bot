// Handle "skin", "skins" Commands
// # --------------------------- #

const { MessageAttachment, MessageActionRow, MessageButton } = require('discord.js');

const api = require('../../api');
const db = require('../../db');
const logic = require('../logic');

const { createSkinCanvas } = require('../misc/canvas.js');
const { sendReply } = require('../misc/reply.js');

const CATEGORY_MAP = { 'A': 0, 'B': 1 }
const INDEX_TO_LETTER = ['A', 'B'];
const CATEGORY_ARR = ['equipment_banner', 'clan_avatar'];

module.exports.sendSkinCommand = async function(interaction, user, skinId) {
    // SKIN
    // Step 1 - Validate ID
    if (!skinId) { return sendReply(interaction, 'You must specify the id of the skin to view!'); } // text-based command calls
    skinId = skinId.toUpperCase();
    const number = skinId.slice(0, -1);
    const categoryId = CATEGORY_MAP[skinId.slice(-1)];
    if (categoryId === undefined || parseInt(number) != number) { return sendReply(interaction, `**${skinId}** is not a valid skin id! Use\`/skins\` to view your skins.`); }
    const skin = await db.skins.getSkinByRelativeId(user.userid, categoryId, parseInt(number));
    if (!skin) { return sendReply(interaction, `You have no skin with id **${skinId}**! Use\`/skins\` to view your skins.`); }
    
    // Step 2 - Fetch Variables/Render Canvas
    const category = CATEGORY_ARR[categoryId];
    const CategoryData = api.skins.getCategoryData(category);
    const SkinData = CategoryData.contents[skin.cosmetic_id];
    const globalSupply = await db.skins.getGlobalSupply(categoryId, skin.cosmetic_id);
    const canvasBuffer = await createSkinCanvas(category, skin.cosmetic_id);
    const attachment = new MessageAttachment(canvasBuffer, `${SkinData.src}.png`);

    // Step 3 - Send Embed
    let embed = {
        color: logic.color.byPurchase(user),
        title: SkinData.name,
        author: {
            name: `${interaction.user.tag} (Lvl. ${user.level})`,
            icon_url: interaction.user.displayAvatarURL()
        },
        fields: [
            { name: 'Category', value: `${CategoryData.name}`, inline: true },
            { name: 'Relative ID', value: `${skinId} \`/skin ${skinId}\``, inline: true },
            { name: 'Global Supply', value: globalSupply, inline: true }
        ],
        image: {
            url: `attachment://${SkinData.src}.png`
        }
    };

    const row = new MessageActionRow().addComponents(
        new MessageButton().setCustomId(`${interaction.id} ${skin.equipped ? 'unequip' : 'equip'}`).setLabel(skin.equipped ? 'Unequip' : 'Equip').setStyle('SUCCESS'),
        new MessageButton().setCustomId(`${interaction.id} discard`).setLabel('Discard').setStyle('SECONDARY')
    );
    sendReply(interaction, { embeds: [embed], files: [attachment], components: [row] }).then(async (sentMessage) => {
        const filter = i => i.customId.split(' ')[0] === interaction.id;

        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 10000 });

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) { return i.reply({ content: 'That button is not for you!', ephemeral: true }); }
            collector.stop();

            const action = i.customId.split(' ')[1];
            let embed2;
            if (action === 'equip') {
                embed2 = await handleEquipButton(user, skin);
            } else if (action === 'unequip') {
                embed2 = await handleUnequipButton(user, skin);
            } else {
                embed2 = await handleDiscardButton(user, skin);
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
async function handleEquipButton(user, skin) {
    // Check if user does NOT have the skin anymore
    const newSkin = await db.skins.getSkin(skin.id);
    if (!newSkin || newSkin.userid !== user.userid) {
        return {
            color: logic.color.STATIC.failure,
            title: 'You no longer own this skin!',
            description: 'Action cancelled!'
        };
    }
    // Check if skin already equipped
    if (newSkin.equipped) {
        return {
            color: logic.color.STATIC.failure,
            title: 'You already have this skin equipped!',
            description: 'Action cancelled!'
        }
    }
    // Update database & send embed
    await db.skins.equipSkin(user.userid, newSkin.id);
    return {
        color: logic.color.byPurchase(user),
        title: `Successfully Equipped!`
    };
}
async function handleUnequipButton(user, skin) {
    // Check if user does NOT have the skin anymore
    const newSkin = await db.skins.getSkin(skin.id);
    if (!newSkin || newSkin.userid !== user.userid) {
        return {
            color: logic.color.STATIC.failure,
            title: 'You no longer own this skin!',
            description: 'Action cancelled!'
        };
    }
    // Check if skin already unequipped
    if (!newSkin.equipped) {
        return {
            color: logic.color.STATIC.failure,
            title: 'You have already unequipped this skin!',
            description: 'Action cancelled!'
        }
    }
    // Update database & send embed
    await db.skins.unequipSkin(newSkin.id);
    return {
        color: logic.color.byPurchase(user),
        title: `Successfully Unequipped!`
    };
}
async function handleDiscardButton(user, skin) {
    // Check if user does NOT have the skin anymore
    const newSkin = await db.skins.getSkin(skin.id);
    if (!newSkin || newSkin.userid !== user.userid) {
        return {
            color: logic.color.STATIC.failure,
            title: 'You no longer own this skin!',
            description: 'Action cancelled!'
        };
    }
    // Update database & send embed
    await db.skins.deleteSkin(newSkin.id);
    return {
        color: logic.color.byPurchase(user),
        title: `Discarded Skin!`
    };
}

module.exports.sendSkinsCommand = async function(interaction, user) {
    // SKINS
    // Step 1 - Fetch Variables
    const AllSkinData = api.skins.getAllSkinData();
    const skins = await db.skins.getAllSkins(user.userid);
    let categories = {};
    for (const skin of skins) {
        if (!categories[skin.category]) { categories[skin.category] = [skin]; }
        else { categories[skin.category].push(skin); }
    }
    const embedDescription = skins.length === 0 ? 'You don\'t have any skins!' : '';
    const embedFields = Object.entries(categories).map(([key, value]) => {
        return {
            name: `${AllSkinData[CATEGORY_ARR[key]].name} (${value.length}/10)`,
            value: value.map((obj, i) => `\`${i+1}${INDEX_TO_LETTER[key]}\` - ${AllSkinData[CATEGORY_ARR[key]].contents[obj.cosmetic_id].name}${obj.equipped ? ' :white_check_mark:' : ''}`).join('\n')
        };
    });
    // Step 2 - Send Embed
    let embed = {
        color: logic.color.byPurchase(user),
        title: 'Skins Collection',
        author: {
            name: `${interaction.user.tag} (Lvl. ${user.level})`,
            icon_url: interaction.user.displayAvatarURL()
        },
        description: embedDescription,
        fields: embedFields
    };
    sendReply(interaction, { embeds: [embed] });
}