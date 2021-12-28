// Handle "shop" Command
// # ----------------- #

const api = require('../../api');
const logic = require('../logic');

module.exports.sendShopEquipmentCommand = async function(interaction, user) {
    // SHOP EQUIPMENT
    // Step 1 - Gather Shop Data (all static)
    const AquariumData = api.aquarium.getAquariumData(user.aquarium + 1);
    const RodData = api.equipment.getRodData(user.rod + 1);
    const LineData = api.equipment.getLineData(user.line + 1);
    const HookData = api.equipment.getHookData(user.hook + 1)
    const GloveData = user.level >= 20 ? api.equipment.getGloveData(user.gloves + 1) : false;
    const SwivelData = user.level >= 50 ? api.equipment.getSwivelData(user.swivel + 1) : false;

    // Step 2 - Embed Fields
    let embedFields = [];
    if (AquariumData) { embedFields.push(createShopField(user, AquariumData, 'Aquarium :truck:', 'Aquarium')); }
    if (RodData) { embedFields.push(createShopField(user, RodData, 'Fishing Rod :fishing_pole_and_fish:', 'Rod')); }
    if (LineData) { embedFields.push(createShopField(user, LineData, 'Fishing Line :thread:', 'Line')); }
    if (HookData) { embedFields.push(createShopField(user, HookData, 'Hook :hook:', 'Hook')); }
    if (GloveData) { embedFields.push(createShopField(user, GloveData, 'Gloves :gloves:', 'Gloves')); }
    if (SwivelData) { embedFields.push(createShopField(user, SwivelData, 'Swivel :chains:', 'Swivel')); }
    if (user.level >= 20) {
        const RingPackData = api.equipment.getRingPackData(user.level);
        // regular ring
        let purchaseable = user.coins >= RingPackData.regular.price;
        embedFields.push({
            name: `${purchaseable ? ':white_check_mark:' : ':credit_card:'}  Regular Ring Pack ${api.emoji.RINGPACK_REGULAR}`,
            value: `1 Random Ring - ${RingPackData.regular.price} coins ${purchaseable ? '`/buy ring regular`' : ''}`
        });
        // premium ring
        purchaseable = user.coins >= RingPackData.premium.price;
        embedFields.push({
            name: `${purchaseable ? ':white_check_mark:' : ':credit_card:'}  Premium Ring Pack ${api.emoji.RINGPACK_PREMIUM}`,
            value: `1 Random Ring - ${RingPackData.premium.price} coins ${purchaseable ? '`/buy ring premium`' : ''}`
        });
    }

    // Step 3 - Send Embed
    let embed = {
        color: logic.color.STATIC.shop,
        title: `Welcome to the Equipment Shop!`,
        author: {
            name: `${interaction.user.username}#${interaction.user.discriminator} (Lvl. ${user.level})`,
            icon_url: interaction.user.displayAvatarURL()
        },
        description: `You have ${user.coins} :coin:
*use \`/compare\` to help analyze items*\n\u200b`,
        fields: embedFields
    };
    interaction.reply({ embeds: [embed] });
}

function createShopField(user, data, title, suffix) {
    const unlocked = user.level >= data.level;
    const purchaseable = unlocked && user.coins >= data.price;
    return {
        name: `${purchaseable ? ':white_check_mark:' : (unlocked ? ':credit_card:' : ':lock:')}  ${title}`,
        value: `${logic.text.capitalizeWords(data.name)} ${suffix} - ${data.price} coins ${purchaseable ? ` \`/buy ${suffix.toLowerCase()}\`` : ''}${!unlocked ? `(unlocked at lvl. ${data.level})` : ''}`
    };
}