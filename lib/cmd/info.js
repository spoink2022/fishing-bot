// Handle "info" Command
// # ----------------- #

const api = require('../../api');
const db = require('../../db');
const logic = require('../logic');

const CATEGORIES = ['fish', 'bait', 'baits', 'ring', 'rings', 'aquarium', 'aquariums', 'rod', 'rods', 'line', 'lines', 'hook', 'hooks', 'glove', 'gloves', 'swivel', 'swivels'];

module.exports.sendInfoCommand = async function(interaction, user) {
    // INFO
    // Step 1 - Parse Argument
    let arg = interaction.options.getString('thing');
    if (!arg) { // General Info Page
        let embed = createGeneralInfoEmbed();
        return interaction.reply({ embeds: [embed] });
    }
    arg = arg.toLowerCase();
    if (CATEGORIES.includes(arg)) { // Category Info Page
        if (arg[arg.length - 1] === 's') { arg = arg.slice(0, -1); }
        let embed = createCategoryInfoEmbed(arg, interaction.user, user);
        return interaction.reply({ embeds: [embed] });
    }

    interaction.reply('REAL ITEM?');
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
        embedFields[i%3].value += `*${logic.text.capitalizeWords(key)} (${value})*\n`;
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
        embedFields[value.stars - 1].value += `*${logic.text.capitalizeWords(key.replace(/_/g, ' '))}*\n`;
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
        embedFields[value.jewel ? 1 : 0].value += `${logic.text.capitalizeWords(key)}\n`;
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
    const UnlockedAquariumNames = api.aquarium.getViewableAquariumData(user.aquarium + 1).map((obj, i) => `*\`${i+1}\` ${i === user.aquarium ? '__' : ''}${logic.text.capitalizeWords(obj.name)} Aquarium${i === user.aquarium ? '__' : ''}*\n`);
    let embedFields = [{ name: 'Viewable Aquarium Upgrades', value: '\u200b', inline: true }, { name: '\u200b', value: '\u200b', inline: true }];
    for (let i=0; i<UnlockedAquariumNames.length; i++) { embedFields[i%2].value += UnlockedAquariumNames[i]; }
    return {
        title: 'Info - Aquariums',
        description: 'Aquariums increase **coins per hour** & increase **aquarium coin capacity**.\nView specific aquarium upgrade data with `/info [Aquarium Upgrade Name]`.',
        fields: embedFields
    };
}
function createRodCategoryEmbed(user) {
    const UnlockedRodNames = api.equipment.getViewableRodData(user.rod + 1).map((obj, i) => `*\`${i+1}\` ${i === user.rod ? '__' : ''}${obj.name} Rod${i === user.rod ? '__' : ''}*\n`);
    let embedFields = [{ name: 'Viewable Rods', value: '\u200b', inline: true }, { name: '\u200b', value: '\u200b', inline: true }];
    for (let i=0; i<UnlockedRodNames.length; i++) { embedFields[i%2].value += UnlockedRodNames[i]; }
    return {
        title: 'Info - Rods',
        description: 'Rods decrease **fishing cooldown** & increase **max weight**.\nView specific rod data with `/info [Rod Name]`.',
        fields: embedFields
    };
}
function createLineCategoryEmbed(user) {
    const UnlockedLineNames = api.equipment.getViewableLineData(user.line + 1).map((obj, i) => `*\`${i+1}\` ${i === user.line ? '__' : ''}${obj.name} Line${i === user.line ? '__' : ''}*\n`);
    let embedFields = [{ name: 'Viewable Lines', value: '\u200b', inline: true }, { name: '\u200b', value: '\u200b', inline: true }];
    for (let i=0; i<UnlockedLineNames.length; i++) { embedFields[i%2].value += UnlockedLineNames[i]; }
    return {
        title: 'Info - Lines',
        description: 'Lines increase **bonus exp** & increase **max weight**.\nView specific line data with `/info [Line Name]`.',
        fields: embedFields
    };
}
function createHookCategoryEmbed(user) {
    const UnlockedHookNames = api.equipment.getViewableHookData(user.hook + 1).map((obj, i) => `*\`${i+1}\` ${i === user.hook ? '__' : ''}${obj.name} Hook${i === user.hook ? '__' : ''}*\n`);
    let embedFields = [{ name: 'Viewable Hooks', value: '\u200b', inline: true }, { name: '\u200b', value: '\u200b', inline: true }];
    for (let i=0; i<UnlockedHookNames.length; i++) { embedFields[i%2].value += UnlockedHookNames[i]; }
    return {
        title: 'Info - Hooks',
        description: 'Hooks increase **bonus coins** & increase **max weight**.\nView specific hook data with `/info [Hook Name]`.',
        fields: embedFields
    };
}
function createGloveCategoryEmbed(user) {
    const UnlockedGloveNames = api.equipment.getViewableGloveData(user.gloves).map((obj, i) => `*\`${i+1}\` ${i-1 === user.gloves ? '__' : ''}${obj.name} Gloves${i-1 === user.gloves ? '__' : ''}*\n`);
    let embedFields = [{ name: 'Viewable Gloves', value: '\u200b', inline: true }, { name: '\u200b', value: '\u200b', inline: true }];
    for (let i=0; i<UnlockedGloveNames.length; i++) { embedFields[i%2].value += UnlockedGloveNames[i]; }
    return {
        title: 'Info - Gloves',
        description: ':star2: Gloves unlock at Lvl. 10\nGloves give a chance to significantly increase **max weight**.\nView specific glove data with `/info [Glove Name]`.',
        fields: embedFields
    };
}
function createSwivelCategoryEmbed(user) {
    const UnlockedSwivelNames = api.equipment.getViewableSwivelData(user.swivel).map((obj, i) => `*\`${i+1}\` ${i-1 === user.swivel ? '__' : ''}${obj.name} Swivel${i-1 === user.swivel ? '__' : ''}*\n`);
    let embedFields = [{ name: 'Viewable Swivels', value: '\u200b', inline: true }, { name: '\u200b', value: '\u200b', inline: true }];
    for (let i=0; i<UnlockedSwivelNames.length; i++) { embedFields[i%2].value += UnlockedSwivelNames[i]; }
    return {
        title: 'Info - Swivels',
        description: ':star2: Swivels unlock at Lvl. 50\nSwivels significantly increase **max weight**, but only on sharks.\nView specific swivel data with `/info [Swivel Name]`.',
        fields: embedFields
    };
}