// Handle "info" Command
// # ----------------- #

const { MessageAttachment } = require('discord.js');

const api = require('../../api');
const db = require('../../db');
const logic = require('../logic');

const { calculateFishWeight } = require('../misc/calculations.js');
const { createInfoCanvas } = require('../misc/canvas.js');
const { sendReply } = require('../misc/reply.js');

const CATEGORIES = [
    'fish', 'bait', 'baits', 'ring', 'rings', 'aquarium', 'aquariums', 'rod', 'rods', 'line', 'lines', 'hook', 'hooks', 
    'glove', 'gloves', 'swivel', 'swivels', 'hull', 'hulls', 'engine', 'engines', 'container', 'containers', 'propeller', 'propellers', 'clanlocation', 'clanlocations'
];
const SIZE_CLASSES = ['small', 'medium', 'large', 'extra large'];
const SIZE_CLASS_ABBRV = ['S', 'M', 'L', 'XL'];
const CARD_GRADES = ['consumer', 'premium', 'sashimi', 'trophy'];

const capitalize = logic.text.capitalizeWords;

module.exports.sendInfoCommand = async function(interaction, user, option) {
    // INFO
    // Step 1 - Parse Argument for General/Category Commands
    if (!option) { // General Info Page
        let embed = createGeneralInfoEmbed();
        return sendReply(interaction, { embeds: [embed] });
    }
    arg = option.toLowerCase();
    if (CATEGORIES.includes(arg)) { // Category Info Page
        if (arg[arg.length - 1] === 's') { arg = arg.slice(0, -1); }
        let embed = createCategoryInfoEmbed(arg, interaction.user, user);
        return sendReply(interaction, { embeds: [embed] });
    }
    // Step 2 - Parse Argument for Specific Item Commands
    let embed, attachment;
    const arr = arg.split(' ');
    const last = arr.at(-1);
    const last2 = arr.at(-2);
    if (last === 'ring') {
        const ringName = arr.slice(0, -1).join('_');
        if (!api.equipment.getRingNames().includes(ringName)) { return sendReply(interaction, `**${option}** is not a valid ring type!`); }
        [embed, attachment] = await createSpecificRingEmbed(ringName);
    } else if (last === 'aquarium' || last2 === 'aquarium') {
        const AquariumNames = api.aquarium.getAquariumNames();
        const aquariumId = last2 === 'aquarium' ? parseInt(last) - 1 : AquariumNames.indexOf(arr.slice(0, -1).join('_'));
        if (!AquariumNames[aquariumId]) { return sendReply(interaction, `**${option}** is not a valid aquarium upgrade!`); }
        [embed, attachment] = await createSpecificAquariumEmbed(aquariumId);
    } else if (last === 'rod' || last2 === 'rod') {
        const RodNames = api.equipment.getRodNames();
        const rodId = last2 === 'rod' ? parseInt(last) - 1 : RodNames.indexOf(capitalize(arr.slice(0, -1).join(' ')));
        if (!RodNames[rodId]) { return sendReply(interaction, `**${option}** is not a valid fishing rod!`); }
        [embed, attachment] = await createSpecificRodEmbed(rodId);
    } else if (last === 'line' || last2 === 'line') {
        const LineNames = api.equipment.getLineNames();
        const lineId = last2 === 'line' ? parseInt(last) - 1 : LineNames.indexOf(capitalize(arr.slice(0, -1).join(' ')));
        if (!LineNames[lineId]) { return sendReply(interaction, `**${option}** is not a valid fishing line!`); }
        [embed, attachment] = await createSpecificLineEmbed(lineId);
    } else if (last === 'hook' || last2 === 'hook') {
        const HookNames = api.equipment.getHookNames();
        const hookId = last2 === 'hook' ? parseInt(last) - 1 : HookNames.indexOf(capitalize(arr.slice(0, -1).join(' ')));
        if (!HookNames[hookId]) { return sendReply(interaction, `**${option}** is not a valid hook!`); }
        [embed, attachment] = await createSpecificHookEmbed(hookId);
    } else if (last === 'glove' || last === 'gloves' || last2 === 'glove' || last2 === 'gloves') {
        const GloveNames = api.equipment.getGloveNames();
        const gloveId = last2 === 'glove' || last2 === 'gloves' ? parseInt(last) - 1 : GloveNames.indexOf(capitalize(arr.slice(0, -1).join(' ')));
        if (!GloveNames[gloveId]) { return sendReply(interaction, `**${option}** is not a valid glove!`); }
        [embed, attachment] = await createSpecificGloveEmbed(gloveId + 1);
    } else if (last === 'swivel' || last2 === 'swivel') {
        const SwivelNames = api.equipment.getSwivelNames();
        const swivelId = last2 === 'swivel' ? parseInt(last) - 1 : SwivelNames.indexOf(capitalize(arr.slice(0, -1).join(' ')));
        if (!SwivelNames[swivelId]) { return sendReply(interaction, `**${option}** is not a valid swivel!`); }
        [embed, attachment] = await createSpecificSwivelEmbed(swivelId + 1);
    } else if (last === 'hull' || last2 === 'hull') {
        const HullNames = api.clan.getAllHullData().map(obj => obj.name);
        const hullId = last2 === 'hull' ? parseInt(last) - 1 : HullNames.indexOf(arr.slice(0, -1).join(' '));
        if (!HullNames[hullId]) { return sendReply(interaction, `**${option}** is not a valid hull!`); }
        [embed, attachment] = await createSpecificHullEmbed(hullId + 1);
    } else if (last === 'engine' || last2 === 'engine') {
        const EngineNames = api.clan.getAllEngineData().map(obj => obj.name);
        const engineId = last2 === 'engine' ? parseInt(last) - 1 : EngineNames.indexOf(arr.slice(0, -1).join(' '));
        if (!EngineNames[engineId]) { return sendReply(interaction, `**${option}** is not a valid engine!`); }
        [embed, attachment] = await createSpecificEngineEmbed(engineId + 1);
    } else if (last === 'container' || last2 === 'container') {
        const ContainerNames = api.clan.getAllContainerData().map(obj => obj.name);
        const containerId = last2 === 'container' ?  parseInt(last) - 1 : ContainerNames.indexOf(arr.slice(0, -1).join(' '));
        if (!ContainerNames[containerId]) { return sendReply(interaction, `**${option}** is not a valid container!`); }
        [embed, attachment] = await createSpecificContainerEmbed(containerId + 1);
    } else if (last === 'propeller' || last2 === 'propeller') {
        const PropellerNames = api.clan.getAllPropellerData().map(obj => obj.name);
        const propellerId = last2 === 'propeller' ? parseInt(last) - 1 : PropellerNames.indexOf(arr.slice(0, -1).join(' '));
        if (!PropellerNames[propellerId]) { return sendReply(interaction, `**${option}** is not a valid propeller!`); }
        [embed, attachment] = await createSpecificPropellerEmbed(propellerId + 1);
    } else if (last2 === 'clanlocation') {
        const AllClanLocationData = api.clan.getAllClanLocationData();
        const clanLocationId = parseInt(last);
        if (!AllClanLocationData[clanLocationId]) { return sendReply(interaction, `**${last}** is not a valid clan location number!`); }
        [embed, attachment] = await createSpecificClanLocationEmbed(clanLocationId);
    } else if (api.bait.getAllBaitNames().includes(arg.replace(/ /g, '_'))) {
        [embed, attachment] = await createSpecificBaitEmbed(arg.replace(/ /g, '_'));
    } else if (api.fish.getFishNames().includes(arg.replace(/ /g, '_'))) {
        if (!api.fish.getAllUnlockedFishData(user.level).map(obj => obj.name).includes(arg.replace(/ /g, '_'))) { return sendReply(interaction, `You must be a higher level to view information about the **${arg}**!`); }
        [embed, attachment] = await createSpecificFishEmbed(user, arg.replace(/ /g, '_'));
    } else if (api.fish.getFamilyNames().includes(arg.replace(/ /g, '_'))) {
        [embed, attachment] = await createSpecificFamilyEmbed(user, arg.replace(/ /g, '_'));
    } else {
        return sendReply(interaction, `**${option}** is not a valid item/fish/category!`);
    }
    if (!embed.color) { embed.color = logic.color.STATIC.light; }
    embed.author = {
        name: `${interaction.user.tag} (Lvl. ${user.level})`,
        icon_url: interaction.user.displayAvatarURL()
    };
    sendReply(interaction, { embeds: [embed], files: attachment ? [attachment] : [] });
}

// Specific Info Embed Generation (temporarily at the top)
async function createSpecificFamilyEmbed(user, familyName) {
    const FamilyData = api.fish.getFamilyData(familyName).filter(fish => fish.location <= Math.floor(user.level/10) + 1);
    let embedDescription = '', embedFields = [];
    if (FamilyData.length === 0) {
        embedDescription = `You have not yet unlocked any fish in the **${capitalize(familyName)}** family.\n\nTry again when you unlock a new location!`;
    } else {
        const AllBaitData = api.bait.getAllBaitData();
        const preferredBait = Object.keys(AllBaitData).filter(key => AllBaitData[key].families.includes(familyName)).map(name => name.replace(/_/g, ' '));
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
    const isLegendary = LocationData.legendary && LocationData.legendary === FishData.id;
    return [{
        color: logic.color.STATIC.location[FishData.location - 1],
        title: `Info - ${capitalize(fishName.replace(/_/g, ' '))}`,
        description: `:map: Location: ${LocationData.name} (${FishData.location})
:dizzy: Rarity: ${isLegendary ? `**Legendary** ${api.emoji.WHITE_STAR}` : logic.text.pctToRarity(FishData.chance)}
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
    if (BaitData.bonus) { bonusDetails += `\n - Temporary max weight increase by **${BaitData.bonus}%**`; }
    if (BaitData.banned) { bonusDetails += `\n- Exclusive to events`; }
    return [{
        title: `Info - ${capitalize(baitName.replace(/_/g, ' '))} (Bait)`,
        description: `Rating: ${':star:'.repeat(BaitData.stars)}\nRecommended Price: ${BaitData.value} :lollipop:${bonusDetails}`,
        image: { url: `attachment://${baitName}.png` }
    }, new MessageAttachment(canvasBuffer, `${baitName}.png`)]
}

async function createSpecificRingEmbed(ringType) {
    const RingData = api.equipment.getRingData(ringType);
    const canvasBuffer = await createInfoCanvas('ring', ringType);
    let embedFields = [{ name: 'Ability', value: '' }];
    RingData.classBoost.forEach((c, i) => embedFields[0].value += c === 0 ? '' : `+${c}% card drops from **${SIZE_CLASSES[i]}** fish\n`);
    RingData.gradeBoost.forEach((c, i) => embedFields[0].value += c === 0 ? '' : `${c}% of **${CARD_GRADES[i]}** converts to **${CARD_GRADES[i+1]}**\n`);
    if (embedFields[0].value === '') { embedFields[0].value = 'None'; }
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

async function createSpecificHullEmbed(hullId) {
    const HullData = api.clan.getHullData(hullId);
    const canvasBuffer = await createInfoCanvas('hull', hullId);
    return [{
        title: `Info - ${capitalize(HullData.name)} Hull`,
        description: `:earth_asia: Accessible Locations: ${hullId}
:card_box: Price: ${HullData.price} :lollipop:`,
        image: { url: `attachment://${HullData.name.replace(/ /g, '_')}_hull.png` }
    }, new MessageAttachment(canvasBuffer, `${HullData.name.replace(/ /g, '_')}_hull.png`)]
}

async function createSpecificEngineEmbed(engineId) {
    const EngineData = api.clan.getEngineData(engineId);
    const canvasBuffer = await createInfoCanvas('engine', engineId);
    return [{
        title: `Info - ${capitalize(EngineData.name)} Engine`,
        description: `:fuelpump: Fuel Efficiency: ${Math.round(EngineData.efficiency * 100)}%
:card_box: Price: ${EngineData.price} :lollipop:`,
        image: { url: `attachment://${EngineData.name.replace(/ /g, '_')}_engine.png` }
    }, new MessageAttachment(canvasBuffer, `${EngineData.name.replace(/ /g, '_')}_engine.png`)]
}

async function createSpecificContainerEmbed(containerId) {
    const ContainerData = api.clan.getContainerData(containerId);
    const canvasBuffer = await createInfoCanvas('container', containerId);
    return [{
        title: `Info - ${capitalize(ContainerData.name)} Container`,
        description: `:package: Capacity: ${ContainerData.capacity}
:card_box: Price: ${ContainerData.price} :lollipop:`,
        image: { url: `attachment://${ContainerData.name.replace(/ /g, '_')}_container.png` }
    }, new MessageAttachment(canvasBuffer, `${ContainerData.name.replace(/ /g, '_')}_container.png`)]
}

async function createSpecificPropellerEmbed(propellerId) {
    const PropellerData = api.clan.getPropellerData(propellerId);
    const canvasBuffer = await createInfoCanvas('propeller', propellerId);
    return [{
        title: `Info - ${capitalize(PropellerData.name)} Propeller`,
        description: `:alarm_clock: Trip Time: ${logic.text.millisToDaysAndHours(PropellerData.cooldown)}
:card_box: Price: ${PropellerData.price} :lollipop:`,
        image: { url: `attachment://${PropellerData.name.replace(/ /g, '_')}_propeller.png` }
    }, new MessageAttachment(canvasBuffer, `${PropellerData.name.replace(/ /g, '_')}_propeller.png`)]
}

async function createSpecificClanLocationEmbed(clanLocationId) {
    const ClanLocationData = api.clan.getClanLocationData(clanLocationId);
    const canvasBuffer = await createInfoCanvas('clanLocation', clanLocationId);
    return [{
        color: logic.color.STATIC.clanLocation[clanLocationId - 1],
        title: `Clan Location ${clanLocationId} - ${ClanLocationData.name}`,
        description: `${api.emoji.CLANBOAT_HULL} Requires hull Lvl. ${clanLocationId}
:fuelpump: Fuel cost: ${ClanLocationData.dist} units`,
        fields: ['common', 'uncommon', 'rare'].map(rarity => {
            return {
                name: capitalize(rarity),
                value: [...new Set(ClanLocationData.spawns[rarity])].map(s => {
                    if (s[0] === 'l') { return `Location ${s.substring(1)} fish` }
                    else if (s[0] === 'b') { return `${s.substring(1)}-star bait`}
                }).join('\n')
            }
        }),
        image: { url: `attachment://location.png`}
    }, new MessageAttachment(canvasBuffer, `location.png`)];
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
Categories:
\`fish\`, \`bait\`, \`rings\`, \`aquariums\`, 
\`rods\`, \`lines\`, \`hooks\`, \`gloves\`, \`swivels\`
\`hulls\` \`engines\` \`containers\` \`propellers\` \`clanlocations\``
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
        case 'hull':
            embed = createHullCategoryEmbed();
            break;
        case 'engine':
            embed = createEngineCategoryEmbed();
            break;
        case 'container':
            embed = createContainerCategoryEmbed();
            break;
        case 'propeller':
            embed = createPropellerCategoryEmbed();
            break;
        case 'clanlocation':
            embed = createClanLocationCategoryEmbed();
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
    let embedFields = [
        { name: ':star:', value: '\u200b', inline: true },
        { name: ':star::star:', value: '\u200b', inline: true },
        { name: ':star::star::star:', value: '\u200b', inline: true },
        { name: ':star::star::star::star:', value: '\u200b', inline: true },
        { name: '\u200b', value: '\u200b', inline: true },
        { name: ':tada:', value: '\u200b', inline: true }
    ];
    for (const[key, value] of Object.entries(AllBaitData)) {
        embedFields[value.banned ? 5 : value.stars - 1].value += `*${capitalize(key.replace(/_/g, ' '))}*\n`;
    }
    return {
        title: 'Info - Bait',
        description: `:star2: Baits unlock at Lvl. 10
Use baits while fishing for better results.
For info on how to get/use baits, use \`/help bait\`
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
    const UnlockedAquariumNames = api.aquarium.getViewableAquariumData(user.aquarium + 1).map((obj, i) => `*\`${i+1}\` ${i === user.aquarium ? '__' : ''}${capitalize(obj.name.replace(/_/g, ' '))} Aquarium${i === user.aquarium ? '__' : ''}*\n`);
    const columnSize = Math.ceil(UnlockedAquariumNames.length / 2);
    let embedFields = [{ name: 'Relevant Aquarium Upgrades', value: '\u200b', inline: true }, { name: '\u200b', value: '\u200b', inline: true }];
    for (let i=0; i<UnlockedAquariumNames.length; i++) { embedFields[Math.floor(i/columnSize)].value += UnlockedAquariumNames[i]; }
    return {
        title: 'Info - Aquariums',
        description: `Aquariums increase **coins per hour** & increase **aquarium coin capacity**.
View specific aquarium data with either of:
\`/info [Aquarium Name]\`\n\`/info aquarium [Number]\``,
        fields: embedFields
    };
}
function createRodCategoryEmbed(user) {
    const UnlockedRodNames = api.equipment.getViewableRodData(user.rod + 1).map((obj, i) => `*\`${i+1}\` ${i === user.rod ? '__' : ''}${obj.name} Rod${i === user.rod ? '__' : ''}*\n`);
    const columnSize = Math.ceil(UnlockedRodNames.length / 2);
    let embedFields = [{ name: 'Relevant Rods', value: '\u200b', inline: true }, { name: '\u200b', value: '\u200b', inline: true }];
    for (let i=0; i<UnlockedRodNames.length; i++) { embedFields[Math.floor(i/columnSize)].value += UnlockedRodNames[i]; }
    return {
        title: 'Info - Rods',
        description: `Rods decrease **fishing cooldown** & increase **max weight**.
View specific rod data with either of:
\`/info [Rod Name]\`\n\`/info rod [Number]\``,
        fields: embedFields
    };
}
function createLineCategoryEmbed(user) {
    const UnlockedLineNames = api.equipment.getViewableLineData(user.line + 1).map((obj, i) => `*\`${i+1}\` ${i === user.line ? '__' : ''}${obj.name} Line${i === user.line ? '__' : ''}*\n`);
    const columnSize = Math.ceil(UnlockedLineNames.length / 2);
    let embedFields = [{ name: 'Relevant Lines', value: '\u200b', inline: true }, { name: '\u200b', value: '\u200b', inline: true }];
    for (let i=0; i<UnlockedLineNames.length; i++) { embedFields[Math.floor(i/columnSize)].value += UnlockedLineNames[i]; }
    return {
        title: 'Info - Lines',
        description: `Lines increase **bonus exp** & increase **max weight**.
View specific line data with either of:
\`/info [Line Name]\`\n\`/info line [Number]\``,
        fields: embedFields
    };
}
function createHookCategoryEmbed(user) {
    const UnlockedHookNames = api.equipment.getViewableHookData(user.hook + 1).map((obj, i) => `*\`${i+1}\` ${i === user.hook ? '__' : ''}${obj.name} Hook${i === user.hook ? '__' : ''}*\n`);
    const columnSize = Math.ceil(UnlockedHookNames.length / 2);
    let embedFields = [{ name: 'Relevant Hooks', value: '\u200b', inline: true }, { name: '\u200b', value: '\u200b', inline: true }];
    for (let i=0; i<UnlockedHookNames.length; i++) { embedFields[Math.floor(i/columnSize)].value += UnlockedHookNames[i]; }
    return {
        title: 'Info - Hooks',
        description: `Hooks increase **bonus coins** & increase **max weight**.
View specific hook data with either of:
\`/info [Hook Name]\`\n\`/info hook [Number]\``,
        fields: embedFields
    };
}
function createGloveCategoryEmbed(user) {
    const UnlockedGloveNames = api.equipment.getViewableGloveData(user.gloves).map((obj, i) => `*\`${i+1}\` ${i+1 === user.gloves ? '__' : ''}${obj.name} Gloves${i+1 === user.gloves ? '__' : ''}*\n`);
    const columnSize = Math.ceil(UnlockedGloveNames.length / 2);
    let embedFields = [{ name: 'Relevant Gloves', value: '\u200b', inline: true }, { name: '\u200b', value: '\u200b', inline: true }];
    for (let i=0; i<UnlockedGloveNames.length; i++) { embedFields[Math.floor(i/columnSize)].value += UnlockedGloveNames[i]; }
    return {
        title: 'Info - Gloves',
        description: `:star2: Gloves unlock at Lvl. 10
Gloves give a chance to significantly increase **max weight**.
View specific glove data with either of:
\`/info [Glove Name]\`\n\`/info glove [Number]\``,
        fields: embedFields
    };
}
function createSwivelCategoryEmbed(user) {
    const UnlockedSwivelNames = api.equipment.getViewableSwivelData(user.swivel).map((obj, i) => `*\`${i+1}\` ${i+1 === user.swivel ? '__' : ''}${obj.name} Swivel${i+1 === user.swivel ? '__' : ''}*\n`);
    const columnSize = Math.ceil(UnlockedSwivelNames.length / 2);
    let embedFields = [{ name: 'Relevant Swivels', value: '\u200b', inline: true }, { name: '\u200b', value: '\u200b', inline: true }];
    for (let i=0; i<UnlockedSwivelNames.length; i++) { embedFields[Math.floor(i/columnSize)].value += UnlockedSwivelNames[i]; }
    return {
        title: 'Info - Swivels',
        description: `:star2: Swivels unlock at Lvl. 50
Swivels significantly increase **max weight**, but only on sharks.
View specific swivel data with either of:
\`/info [Swivel Name]\`\n\`/info swivel [Number]\``,
        fields: embedFields
    };
}
function createHullCategoryEmbed() {
    const AllHullData = api.clan.getAllHullData();
    return {
        title: 'Info - Clan Boat Hulls',
        description: `${api.emoji.CLANBOAT_HULL} The hull determines the location the Clan Boat may be sent to.
:trophy: **Trophy grade** cards must be spent to upgrade the hull.`,
        fields: [{
            name: 'All Hulls',
            value: AllHullData.map((hull, i) => `\`${i + 1}\` ${capitalize(hull.name)} Hull`).join('\n')
        }]
    };
}
function createEngineCategoryEmbed() {
    const AllEngineData = api.clan.getAllEngineData();
    return {
        title: 'Info - Clan Boat Engines',
        description: `${api.emoji.CLANBOAT_ENGINE} The engine determines the efficiency at which fuel is burned.
:fried_shrimp: **Premium grade** cards must be spent to upgrade the engine.`,
        fields: [{
            name: 'All Engines',
            value: AllEngineData.map((engine, i) => `\`${i + 1}\` ${capitalize(engine.name)} Engine`).join('\n')
        }]
    };
}
function createContainerCategoryEmbed() {
    const AllContainerData = api.clan.getAllContainerData();
    return {
        title: 'Info - Clan Boat Containers',
        description: `${api.emoji.CLANBOAT_CONTAINER} The container determines the capacity of the Clan Boat.
:sushi: **Sashimi grade** cards must be spent to upgrade the container.`,
        fields: [{
            name: 'All Containers',
            value: AllContainerData.map((container, i) => `\`${i + 1}\` ${capitalize(container.name)} Container`).join('\n')
        }]
    };
}
function createPropellerCategoryEmbed() {
    const AllPropellerData = api.clan.getAllPropellerData();
    return {
        title: 'Info - Clan Boat Propellers',
        description: `${api.emoji.CLANBOAT_PROPELLER} The propeller determines the time a trip takes.
:rock: **Consumer grade** cards must be spent to upgrade the propeller.`,
        fields: [{
            name: 'All Propellers',
            value: AllPropellerData.map((propeller, i) => `\`${i + 1}\` ${capitalize(propeller.name)} Propeller`).join('\n')
        }]
    };
}

function createClanLocationCategoryEmbed() {
    const AllClanLocationData = api.clan.getAllClanLocationData();
    return {
        title: 'Info - Clan Boat Locations',
        description: `These locations are only accessible with the Clan Boat.
Upgrading your hull unlocks more locations.
\nView specific location data with:
\`/info clanlocation [Number]\``,
        fields: [{
            name: 'All Clan Locations',
            value: Object.values(AllClanLocationData).map((loc, i) => `\`${i + 1}\` ${loc.name}`).join('\n')
        }]
    };
}