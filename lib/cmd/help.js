// Handle "quickstart, help" Commands
// # ------------------------------ #

const logic = require('../logic');

module.exports.sendQuickstartCommand = async function(interaction, user) {
    let embed = {
        color: logic.color.STATIC.tuna,
        title: 'Quickstart Guide',
        description: `**Welcome to Big Tuna!**
This guide will walk you through everything you need to know until reaching Lvl. 10
\n**The "Fish" Command**
Use this command to get to know the game and work your way up to Lvl. 10!
:small_blue_diamond: Use it by typing \`/fish\` or \`.fish\`
:small_blue_diamond: Get coins and exp
:small_blue_diamond: Gain levels
:small_blue_diamond: Your best catch (per species) automatically gets sent to your aquarium
:small_blue_diamond: No cooldown until you reach Lvl. 10
*Your line will snap if your Rod, Line, or Hook cannot support the weight of the fish!*
\n**Useful Commands**
\`/help\` - View the general help menu
\`/aquarium\` - View your best catch (per species) and passively earn coins
\`/collect\` - Collect the coins from your aquarium
\`/shop\` - Upgrade your equipment
\`/equipment\` - View your equipment
\`/stats player\` - View your personal profile, including coins and exp
\nFeel free to explore the other 90% of commands, but until reaching Lvl. 10, this is all you really need. Happy Fishing!`
    };
    interaction.reply({ embeds: [embed] })
}

module.exports.sendHelpCommand = async function(interaction, user) {
    const option = interaction.options.getString('option') || 'general';
    if (!(option in HELP_TEXT)) { return interaction.reply(`**${option}** is not a valid option! Use \`/help\` to see a list of valid options.`); }
    
    let embed = HELP_TEXT[option.toLowerCase()];
    embed.color = logic.color.STATIC.light,
    interaction.reply({ embeds: [embed] });
}

const HELP_TEXT = {
    general: {
        title: 'Help - Detailed Guides for Big Tuna',
        description: `For a a quickstart guide, use \`/quickstart\`
\n:earth_americas: **General**
\`/help\` - View a list of help commands
\`/help all\` - View all bot commands
\`/help parameters\` - View all bot command options
\n:gear: **Concepts**
\`/help fish\` - Fishing mechanics
\`/help info\` - Game data
\`/help weather\` - Weather
\`/help skin\` - Skins
\`/help score\` - Fisher score (beta)
\n:star2: **Lvl. 10+**
\`/help glove\` - Equipment type
\`/help swivel\` - Equipment type (Lvl. 50+)
\`/help ring\` - Equipment type (Lvl. 20+)
\`/help card\` - Fish cards (Lvl. 20+)
\`/help quest\` - Quests and weekly bounties
\`/help bait\` - Everything about baits
\n:sushi: **Special**
\`/help supporter\` - Supporter perks
\`/help clan\` - Fishing clans
\n**Helpful Links**
[Invite Big Tuna](https://discord.com/oauth2/authorize?client_id=803361191166607370&permissions=59456&scope=bot) | \
[Official Discord Server](https://discord.gg/RaN2VE9zpa) | \
[Online Commands Page](https://bigtuna.xyz/commands)`
    },
    all: {
        title: 'Big Tuna Command List',
        description: `:fish: **Gameplay** :fish:
\`/aquarium\` - Check one of your aquariums
\`/aquariums\` - Check all of your aquariums
\`/bait\` - Check your bait
\`/bounty\` - Check the weekly bounty
\`/buy\` - Buy from the shop
\`/card\` - Check one of your cards
\`/cards\` - Check all of your cards
\`/collect\` - Collect coins from your aquariums
\`/cooldowns\` - Check your current cooldowns
\`/equipment\` - Check your equipment
\`/fish\` - Catch fish
\`/give\` - Give something to another player
\`/location\` - View info about a location
\`/locations\` - View all locations and their weather
\`/quest\` - Check/claim/reset your current quest
\`/ring\` - Check one of your rings
\`/rings\` - Check all of your rings
\`/setlocation\` - Change your fishing location
\`/stats\` - Check stats.
\`/shop\` - View/buy from the shop
\`/vote\` - Reset your fishing cooldown
\`/weather\` - View all locations and their weather
\n:trophy: **Rankings** :trophy:
\`/fishleaderboards\` - View leaderboards for a fish species
\`/leaderboards\` - View server leaderboards
\n:sushi: **Special** :sushi:
\`/clan\` - Base command for clans (see \`/help clan\`)
\`/help\` - Access help information
\`/quickstart\` - Access the quickstart guide
\`/info\` - View game data
\`/opt\` - Change the availability of your game information
\`/skin\` - Check one of your skins
\`/skins\` - Check all of your skins`
    },
    parameters: {
        title: 'Big Tuna Command List (Parameters)',
        description: `:fish: **Gameplay** :fish:
\`/aquarium [id (optional)] [user (optional)]\`
\`/aquariums [user (optional)]\`
\`/bait\`
\`/bounty\`
\`/buy [equipment]\`
\`/card [id] [user (optional)]\`
\`/cards [user (optional)]\`
\`/collect\`
\`/cooldowns\`
\`/equipment [user (optional)]\`
\`/fish [bait (optional)]\`
\`/give [card/ring/skin] [id] [user (optional)]\`
\`/location [id]\`
\`/locations\`
\`/quest [user (optional)]\`
\`/ring [id] [user (optional)]\`
\`/rings [user (optional)]\`
\`/setlocation [id]\`
\`/stats [player/server/global] [user (player) (optional)]\`
\`/shop [bait/equipment/rings]\`
\`/vote\`
\`/weather\`
\n:trophy: **Rankings** :trophy:
\`/fishleaderboards [fish]\`
\`/leaderboards [kg/score]\`
\n:sushi: **Special** :sushi:
\`/clan [command]\`
\`/help [option]\`
\`/quickstart\`
\`/info [thing]\`
\`/opt [in/out]\`
\`/skin [id]\`
\`/skins\``
    }
};