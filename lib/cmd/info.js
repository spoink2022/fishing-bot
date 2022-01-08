// Handle "info" Command
// # ----------------- #

const { MessageAttachment } = require('discord.js');

const api = require('../../api');
const db = require('../../db');
const logic = require('../logic');

const { calculateFishWeight } = require('../misc/calculations.js');
const { createInfoCanvas } = require('../misc/canvas.js');

const CATEGORIES = ['fish', 'bait', 'baits', 'ring', 'rings', 'aquarium', 'aquariums', 'rod', 'rods', 'line', 'lines', 'hook', 'hooks', 'glove', 'gloves', 'swivel', 'swivels'];
const SIZE_CLASSES = ['small', 'medium', 'large', 'extra large'];
const SIZE_CLASS_ABBRV = ['S', 'M', 'L', 'XL'];
const CARD_GRADES = ['consumer', 'premium', 'sashimi', 'trophy'];

const capitalize = logic.text.capitalizeWords;

module.exports.sendInfoCommand = async function(interaction, user, option) {
    // INFO
    // Step 1 - Parse Argument for General/Category Commands
    if (!option) { // General Info Page
        let embed = createGeneralInfoEmbed();
        return interaction.reply({ embeds: [embed] });
    }
    arg = option.toLowerCase();
    if (CATEGORIES.includes(arg)) { // Category Info Page
        if (arg[arg.length - 1] === 's') { arg = arg.slice(0, -1); }
        let embed = createCategoryInfoEmbed(arg, interaction.user, user);
        return interaction.reply({ embeds: [embed] });
    }
    // Step 2 - Parse Argument for Specific Item Commands
    let embed, attachment;
    if (arg.endsWith(' ring')) {
        if (!api.equipment.getRingNames().includes(arg.slice(0, -5).replace(/ /g, '_'))) { return interaction.reply(`**${option}** is not a valid ring type!`); }
        [embed, attachment] = await createSpecificRingEmbed(arg.slice(0, -5).replace(/ /g, '_'));
    } else if (arg.endsWith('aquarium')) {
        const aquariumId = api.aquarium.getAquariumNames().indexOf(arg.replace(/ /g, '_').slice(0, -9));
        if (aquariumId === -1) { return interaction.reply(`**${option}** is not a valid aquarium upgrade!`); }
        [embed, attachment] = await createSpecificAquariumEmbed(aquariumId);
    } else if (arg.endsWith('rod')) {
        const rodId = api.equipment.getRodNames().indexOf(capitalize(arg).slice(0, -4));
        if (rodId === -1) { return interaction.reply(`**${option}** is not a valid fishing rod!`); }
        [embed, attachment] = await createSpecificRodEmbed(rodId);
    } else if (arg.endsWith('line')) {
        const lineId = api.equipment.getLineNames().indexOf(capitalize(arg).slice(0, -5));
        if (lineId === -1) { return interaction.reply(`**${option}** is not a valid fishing line!`); }
        [embed, attachment] = await createSpecificLineEmbed(lineId);
    } else if (arg.endsWith('hook')) {
        const hookId = api.equipment.getHookNames().indexOf(capitalize(arg).slice(0, -5));
        if (hookId === -1) { return interaction.reply(`**${option}** is not a valid hook!`); }
        [embed, attachment] = await createSpecificHookEmbed(hookId);
    } else if (arg.endsWith('glove') || arg.endsWith('gloves')) {
        const gloveId = api.equipment.getGloveNames().indexOf(capitalize(arg).split(' ').slice(0, -1).join(' ')) + 1;
        if (gloveId === -1) { return interaction.reply(`**${option}** is not a valid glove!`); }
        [embed, attachment] = await createSpecificGloveEmbed(gloveId);
    } else if (arg.endsWith('swivel')) {
        const swivelId = api.equipment.getSwivelNames().indexOf(capitalize(arg).slice(0, -7)) + 1;
        if (swivelId === -1) { return interaction.reply(`**${option}** is not a valid swivel!`); }
        [embed, attachment] = await createSpecificSwivelEmbed(swivelId);
    } else if (api.bait.getAllBaitNames().includes(arg.replace(/ /g, '_'))) {
        [embed, attachment] = await createSpecificBaitEmbed(arg.replace(/ /g, '_'));
    } else if (api.fish.getFishNames().includes(arg.replace(/ /g, '_'))) {
        if (!api.fish.getAllUnlockedFishData(user.level).map(obj => obj.name).includes(arg.replace(/ /g, '_'))) { return interaction.reply(`You must be a higher level to view information about the **${arg}**!`); }
        [embed, attachment] = await createSpecificFishEmbed(user, arg.replace(/ /g, '_'));
    } else if (api.fish.getFamilyNames().includes(arg.replace(/ /g, '_'))) {
        [embed, attachment] = await createSpecificFamilyEmbed(user, arg.replace(/ /g, '_'));
    }
    else {
        return interaction.reply(`**${option}** is not a valid item/fish/category!`);
    }
    if (!embed.color) { embed.color = logic.color.STATIC.light; }
    embed.author = {
        name: `${interaction.user.tag} (Lvl. ${user.level})`,
        icon_url: interaction.user.displayAvatarURL()
    };
    interaction.reply({ embeds: [embed], files: attachment ? [attachment] : [] });
}

// Specific Info Embed Generation (temporarily at the top)
async function createSpecificFamilyEmbed(user, familyName) {
    const FamilyData = api.fish.getFamilyData(familyName).filter(fish => fish.location <= Math.floor(user.level/10) + 1);
    let embedDescription = '', embedFields = [];
    if (FamilyData.length === 0) {
        embedDescription = `You have not yet unlocked any fish in the **${capitalize(familyName)}** family.\n\nTry again when you unlock a new location!`;
    } else {
        const AllBaitData = api.bait.getAllBaitData();
        const preferredBait = Object.keys(AllBaitData).filter(key => AllBaitData[key].families.includes(familyName));
        if (preferredBait.length !== 0) { embedDescription = `Preferred bait: **${preferredBait.join(', ')}**`; }

        const LocationNames = api.fish.getLocationNames();
        let locations = {};
        FamilyData.forEach(fish => {
            if (!locations[fish.location]) { locations[fish.location] = `${capitalize(fish.name.replace(/_/g, ' '))} (${logic.text.kgToWeight(fish.sizeMin)} - ${logic.text.kgToWeight(fish.sizeMax)})`; }
            else { locations[fish.location] += `\n${capitalize(fish.name.replace(/_/g, ' '))} (${logic.text.kgToWeight(fish.sizeMin)} - ${logic.text.kgToWeight(fish.sizeMax)})`; }
        });
        embedFields = Object.entries(locations).map(([key, value]) => {
            return { name: `${LocationNames[key - 1]} (${key})`, value: value };
        });
    }
    return [{
        title: `Info - ${capitalize(familyName.replace(/_/g, ' '))} (Fish Family)`,
        description: embedDescription,
        fields: embedFields
    }, false];
}

async function createSpecificFishEmbed(user, fishName) {
    const FishData = api.fish.getFishDataByName(fishName);
    const LocationData = api.fish.getLocationData(FishData.location);
    const highest = await db.aquarium.getLargestSize(user.userid, fishName);
    const canvasBuffer = await createInfoCanvas('fish', FishData.id);
    return [{
        color: logic.color.STATIC.location[FishData.location - 1],
        title: `Info - ${capitalize(fishName.replace(/_/g, ' '))}`,
        description: `:map: Location: ${LocationData.name} (${FishData.location})
:dizzy: Rarity: ${logic.text.pctToRarity(FishData.chance)}
${api.emoji[`SIZE_${SIZE_CLASS_ABBRV[FishData.sizeClass - 1]}`]} Class: ${SIZE_CLASSES[FishData.sizeClass - 1]}
:notebook_with_decorative_cover: Family: ${FishData.family ? FishData.family : 'None'}
:moneybag: Value: ${FishData.value} coins/kg
:scales: Weight: ${logic.text.kgToWeight(FishData.sizeMin)} - ${logic.text.kgToWeight(FishData.sizeMax)}+
:trophy: Personal Best: ${highest === -1 ? 'None' : `${logic.text.kgToWeight(calculateFishWeight(highest, FishData))} (${logic.text.rToTier(highest)})`}`,
        image: { url: `attachment://${fishName}.png` }
    }, new MessageAttachment(canvasBuffer, `${fishName}.png`)];
}

async function createSpecificBaitEmbed(baitName) {
    const BaitData = api.bait.getBaitData(baitName);
    const canvasBuffer = await createInfoCanvas('bait', baitName);
    let bonusDetails = '';
    if (BaitData.tier !== 'D') { bonusDetails += `\n- Minimum fish tier: **${BaitData.tier}**`; }
    if (BaitData.sizes.length !== 4) { bonusDetails += `\n- Catches exclusively **${BaitData.sizes.map(num => SIZE_CLASSES[num - 1]).join(', ')}** fish`; }
    if (BaitData.families.length !== 0) { bonusDetails += `\n- More likely to catch **${BaitData.families.join(', ')}**` }
    return [{
        title: `Info - ${capitalize(baitName.replace(/_/g, ' '))} (Bait)`,
        description: `Rating: ${':star:'.repeat(BaitData.stars)}\nRecommended Price: ${BaitData.value} :lollipop:${bonusDetails}`,
        image: { url: `attachment://${baitName}.png` }
    }, new MessageAttachment(canvasBuffer, `${baitName}.png`)]
}

async function createSpecificRingEmbed(ringType) {
    const RingData = api.equipment.getRingData(ringType);
    const canvasBuffer = await createInfoCanvas('ring', ringType);
    let embedFields = [{ name: 'Ability', value: '\u200b' }];
    RingData.classBoost.filter(c => c !== 0).forEach((c, i) => embedFields[0].value += `+${c}% card drops from **${SIZE_CLASSES[i]}** fish\n`);
    RingData.gradeBoost.filter(c => c !== 0).forEach((c, i) => embedFields[0].value += `${c}% of **${CARD_GRADES[i]}** converts to **${CARD_GRADES[i+1]}**\n`);
    return [{
        title: `Info - ${capitalize(ringType.replace(/_/g, ' '))} Ring`,
        description: `${RingData.jewel ? api.emoji.RINGPACK_PREMIUM : api.emoji.RINGPACK_REGULAR} Type: ${RingData.jewel ? 'Premium' : 'Regular'}
:coin: Sell Rate: ${api.equipment.getRingSellRate(RingData.rating)}% regular pack price`,
        fields: embedFields,
        image: { url: `attachment://${ringType}_ring.png` }
    }, new MessageAttachment(canvasBuffer, `${ringType}_ring.png`)]
}

async function createSpecificAquariumEmbed(aquariumId) {
    const AquariumData = api.aquarium.getAquariumData(aquariumId);
    const canvasBuffer = await createInfoCanvas('aquarium', aquariumId);
    return [{
        title: `Info - ${capitalize(AquariumData.name.replace(/_/g, ' '))} Aquarium`,
        description: `:star2: Unlocks at Lvl. ${AquariumData.level}\n:coin: Price: ${AquariumData.price} coins
:bank: Capacity: ${AquariumData.max} coins\n:gem: Coin Multiplier: +${Math.round(AquariumData.multiplier*100)-100}%`,
        image: { url: `attachment://aquarium_${aquariumId}.png` }
    }, new MessageAttachment(canvasBuffer, `aquarium_${aquariumId}.png`)]
}

async function createSpecificRodEmbed(rodId) {
    const RodData = api.equipment.getRodData(rodId);
    const canvasBuffer = await createInfoCanvas('rod', rodId);
    return [{
        title: `Info - ${RodData.name} Rod`,
        description: `:star2: Unlocks at Lvl. ${RodData.level}\n:coin: Price: ${RodData.price} coins
:scales: Max Weight: ${RodData.maxWeight}kg\n:alarm_clock: Cooldown: ${logic.text.millisToHoursAndMinutes(RodData.cooldown)}`,
        image: { url: `attachment://rod_${rodId}.png` }
    }, new MessageAttachment(canvasBuffer, `rod_${rodId}.png`)]
}

async function createSpecificLineEmbed(lineId) {
    const LineData = api.equipment.getLineData(lineId);
    const canvasBuffer = await createInfoCanvas('line', lineId);
    return [{
        title: `Info - ${LineData.name} Line`,
        description: `:star2: Unlocks at Lvl. ${LineData.level}\n:coin: Price: ${LineData.price} coins
:scales: Max Weight: ${LineData.maxWeight}kg\n:gift: Bonus Exp: +${LineData.bonus} per catch`,
        image: { url: `attachment://line_${lineId}.png` }
    }, new MessageAttachment(canvasBuffer, `line_${lineId}.png`)]
}

async function createSpecificHookEmbed(hookId) {
    const HookData = api.equipment.getHookData(hookId);
    const canvasBuffer = await createInfoCanvas('hook', hookId);
    return [{
        title: `Info - ${HookData.name} Hook`,
        description: `:star2: Unlocks at Lvl. ${HookData.level}\n:coin: Price: ${HookData.price} coins
:scales: Max Weight: ${HookData.maxWeight}kg\n:gem: Coin Bonus (Fishing): +${Math.round(HookData.multiplier*100)-100}%`,
        image: { url: `attachment://hook_${hookId}.png` }
    }, new MessageAttachment(canvasBuffer, `hook_${hookId}.png`)]
}

async function createSpecificGloveEmbed(gloveId) {
    const GloveData = api.equipment.getGloveData(gloveId);
    const canvasBuffer = await createInfoCanvas('glove', gloveId);
    return [{
        title: `Info - ${GloveData.name} Gloves`,
        description: `:star2: Unlocks at Lvl. ${GloveData.level}\n:coin: Price: ${GloveData.price} coins
:four_leaf_clover: Activation Chance: ${GloveData.chance}%\n:mechanical_arm: Activation Bonus: +${GloveData.bonus}kg`,
        image: { url: `attachment://glove_${gloveId}.png` }
    }, new MessageAttachment(canvasBuffer, `glove_${gloveId}.png`)]
}

async function createSpecificSwivelEmbed(swivelId) {
    const SwivelData = api.equipment.getSwivelData(swivelId);
    const canvasBuffer = await createInfoCanvas('swivel', swivelId);
    return [{
        title: `Info - ${SwivelData.name} Swivel`,
        description: `:star2: Unlocks at Lvl. ${SwivelData.level}\n:coin: Price: ${SwivelData.price} coins
:shark: Activation Bonus: +${SwivelData.bonus}kg`,
        image: { url: `attachment://swivel_${swivelId}.png` }
    }, new MessageAttachment(canvasBuffer, `swivel_${swivelId}.png`)]
}

// General Info Embed Generation
function createGeneralInfoEmbed() {
    let embed = {
        color: logic.color.STATIC.light,
        title: 'Info - Usage Guide',
        fields: [
            {
                name: '/info',
                value: 'Generates this page.'
            },
            {
                name: '/info [category]',
                value: `Provides general info about a specific category.
Categories: \`fish\`, \`bait\`, \`rings\`, \`aquariums\`, \`rods\`, \`lines\`, \`hooks\`, \`gloves\`, \`swivels\``
            },
            {
                name: '/info [thing]',
                value: `Provides info about a specific item/bait/fish from any of the categories listed above.
\n__Example Usage__
\`/info\`
\`/info fish\`
\`/info hooks\`
\`/info green sunfish\`
\`/info worms\`
\`/info gold ring\`
\`/info standard aquarium\`
\`/info standard rod\`
\`/info thin line\`
\`/info rusty hook\`
\`/info cheap glove\`
\`/info small swivel\``
            }
        ]
    };
    return embed;
}

// Category Info Embed Generation
function createCategoryInfoEmbed(category, author, user) {
    let embed;
    switch (category) {
        case 'fish':
            embed = createFishCategoryEmbed(user);
            break;
        case 'bait':
            embed = createBaitCategoryEmbed();
            break;
        case 'ring':
            embed = createRingCategoryEmbed();
            break;
        case 'aquarium':
            embed = createAquariumCategoryEmbed(user);
            break;
        case 'rod':
            embed = createRodCategoryEmbed(user);
            break;
        case 'line':
            embed = createLineCategoryEmbed(user);
            break;
        case 'hook':
            embed = createHookCategoryEmbed(user);
            break;
        case 'glove':
            embed = createGloveCategoryEmbed(user);
            break;
        case 'swivel':
            embed = createSwivelCategoryEmbed(user);
            break;
        default:
            break;
    }
    embed.color = logic.color.STATIC.light;
    embed.author = {
        name: `${author.username}#${author.discriminator} (Lvl. ${user.level})`,
        icon_url: author.displayAvatarURL()
    };
    return embed;
}

function createFishCategoryEmbed(user) {
    const FamilyData = api.fish.getAllFamilyData();
    const HighestLocation = api.fish.getAllUnlockedLocationData(user.level).slice(-1)[0].id;
    let UnlockedFamilyData = {};
    for (const [key, value] of Object.entries(FamilyData)) {
        let total = value.filter(fish => fish.location <= HighestLocation).length;
        if (total) { UnlockedFamilyData[key] = total; }
    }
    let embedFields = [{ name: 'Fish Families', value: '\u200b', inline: true }, { name: '\u200b', value: '\u200b', inline: true }, { name: '\u200b', value: '\u200b', inline: true }];
    Object.entries(UnlockedFamilyData).forEach(([key, value], i) => {
        embedFields[i%3].value += `*${capitalize(key)} (${value})*\n`;
    });
    return {
        title: 'Info - Fish',
        description: `For a list of specific fish species, use the \`/location\` command.
The \`/info [Fish Name]\` command accepts species as well as families.`,
        fields: embedFields
    };
}
function createBaitCategoryEmbed() {
    const AllBaitData = api.bait.getAllBaitData();
    let embedFields = [{ name: ':star:', value: '\u200b', inline: true }, { name: ':star::star:', value: '\u200b', inline: true }, { name: ':star::star::star:', value: '\u200b', inline: true }];
    for (const[key, value] of Object.entries(AllBaitData)) {
        if (value.banned) { continue; }
        embedFields[value.stars - 1].value += `*${capitalize(key.replace(/_/g, ' '))}*\n`;
    }
    return {
        title: 'Info - Bait',
        description: `:star2: Baits unlock at Lvl. 10
Use baits while fishing for better results.
See your baits with \`/bait\` and use them with \`/fish [Bait Name]\`.
For specific info on a bait, use \`/info [Bait Name]\`
\nBelow, baits are sorted by relative usefulness.`,
        fields: embedFields
    };
}
function createRingCategoryEmbed() {
    const RingTypeData = api.equipment.getRingTypeData();
    let embedFields = [{ name: 'Regular Types', value: '\u200b', inline: true }, { name: 'Premium Types', value: '\u200b', inline: true }];
    Object.entries(RingTypeData).forEach(([key, value]) => {
        embedFields[value.jewel ? 1 : 0].value += `${capitalize(key)}\n`;
    });
    return {
        title: 'Info - Rings',
        description: `:star2: Rings unlock at Lvl. 20
Rings have types attributes that affect card drops.
Use \`/info [Ring Type]\` to learn more about a ring type.`,
        fields: embedFields
    };
}
function createAquariumCategoryEmbed(user) {
    const UnlockedAquariumNames = api.aquarium.getViewableAquariumData(user.aquarium + 1).map((obj, i) => `*\`${i+1}\` ${i === user.aquarium ? '__' : ''}${capitalize(obj.name)} Aquarium${i === user.aquarium ? '__' : ''}*\n`);
    let embedFields = [{ name: 'Relevant Aquarium Upgrades', value: '\u200b', inline: true }, { name: '\u200b', value: '\u200b', inline: true }];
    for (let i=0; i<UnlockedAquariumNames.length; i++) { embedFields[i%2].value += UnlockedAquariumNames[i]; }
    return {
        title: 'Info - Aquariums',
        description: 'Aquariums increase **coins per hour** & increase **aquarium coin capacity**.\nView specific aquarium upgrade data with `/info [Aquarium Upgrade Name]`.',
        fields: embedFields
    };
}
function createRodCategoryEmbed(user) {
    const UnlockedRodNames = api.equipment.getViewableRodData(user.rod + 1).map((obj, i) => `*\`${i+1}\` ${i === user.rod ? '__' : ''}${obj.name} Rod${i === user.rod ? '__' : ''}*\n`);
    let embedFields = [{ name: 'Relevant Rods', value: '\u200b', inline: true }, { name: '\u200b', value: '\u200b', inline: true }];
    for (let i=0; i<UnlockedRodNames.length; i++) { embedFields[i%2].value += UnlockedRodNames[i]; }
    return {
        title: 'Info - Rods',
        description: 'Rods decrease **fishing cooldown** & increase **max weight**.\nView specific rod data with `/info [Rod Name]`.',
        fields: embedFields
    };
}
function createLineCategoryEmbed(user) {
    const UnlockedLineNames = api.equipment.getViewableLineData(user.line + 1).map((obj, i) => `*\`${i+1}\` ${i === user.line ? '__' : ''}${obj.name} Line${i === user.line ? '__' : ''}*\n`);
    let embedFields = [{ name: 'Relevant Lines', value: '\u200b', inline: true }, { name: '\u200b', value: '\u200b', inline: true }];
    for (let i=0; i<UnlockedLineNames.length; i++) { embedFields[i%2].value += UnlockedLineNames[i]; }
    return {
        title: 'Info - Lines',
        description: 'Lines increase **bonus exp** & increase **max weight**.\nView specific line data with `/info [Line Name]`.',
        fields: embedFields
    };
}
function createHookCategoryEmbed(user) {
    const UnlockedHookNames = api.equipment.getViewableHookData(user.hook + 1).map((obj, i) => `*\`${i+1}\` ${i === user.hook ? '__' : ''}${obj.name} Hook${i === user.hook ? '__' : ''}*\n`);
    let embedFields = [{ name: 'Relevant Hooks', value: '\u200b', inline: true }, { name: '\u200b', value: '\u200b', inline: true }];
    for (let i=0; i<UnlockedHookNames.length; i++) { embedFields[i%2].value += UnlockedHookNames[i]; }
    return {
        title: 'Info - Hooks',
        description: 'Hooks increase **bonus coins** & increase **max weight**.\nView specific hook data with `/info [Hook Name]`.',
        fields: embedFields
    };
}
function createGloveCategoryEmbed(user) {
    const UnlockedGloveNames = api.equipment.getViewableGloveData(user.gloves).map((obj, i) => `*\`${i+1}\` ${i-1 === user.gloves ? '__' : ''}${obj.name} Gloves${i-1 === user.gloves ? '__' : ''}*\n`);
    let embedFields = [{ name: 'Relevant Gloves', value: '\u200b', inline: true }, { name: '\u200b', value: '\u200b', inline: true }];
    for (let i=0; i<UnlockedGloveNames.length; i++) { embedFields[i%2].value += UnlockedGloveNames[i]; }
    return {
        title: 'Info - Gloves',
        description: ':star2: Gloves unlock at Lvl. 10\nGloves give a chance to significantly increase **max weight**.\nView specific glove data with `/info [Glove Name]`.',
        fields: embedFields
    };
}
function createSwivelCategoryEmbed(user) {
    const UnlockedSwivelNames = api.equipment.getViewableSwivelData(user.swivel).map((obj, i) => `*\`${i+1}\` ${i-1 === user.swivel ? '__' : ''}${obj.name} Swivel${i-1 === user.swivel ? '__' : ''}*\n`);
    let embedFields = [{ name: 'Relevant Swivels', value: '\u200b', inline: true }, { name: '\u200b', value: '\u200b', inline: true }];
    for (let i=0; i<UnlockedSwivelNames.length; i++) { embedFields[i%2].value += UnlockedSwivelNames[i]; }
    return {
        title: 'Info - Swivels',
        description: ':star2: Swivels unlock at Lvl. 50\nSwivels significantly increase **max weight**, but only on sharks.\nView specific swivel data with `/info [Swivel Name]`.',
        fields: embedFields
    };
}