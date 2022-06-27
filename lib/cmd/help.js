// Handle "quickstart, help" Commands
// # ------------------------------ #

const { MessageAttachment } = require('discord.js');

const api = require('../../api');
const logic = require('../logic');

const { createSkinHelpCanvas } = require('../misc/canvas.js');
const { sendReply } = require('../misc/reply.js');

module.exports.sendQuickstartCommand = async function(interaction, user) {
    let embed = {
        color: logic.color.STATIC.tuna,
        title: 'Quickstart Guide',
        description: `**Welcome to Big Tuna!**
This guide will walk you through everything you need to know until reaching Lvl. 10
\n**What You Can Expect**
:small_blue_diamond: Catch **140+** unique fish species :fish:
:small_blue_diamond: Manage **11** different aquariums :truck:
:small_blue_diamond: Purchase **200+** unique pieces of equipment :fishing_pole_and_fish:
:small_blue_diamond: Compete with **2000+** other servers :sunglasses:
:small_blue_diamond: Join one of **70+** fishing clans :shield:
:small_blue_diamond: Make use of **50+** unique commands :scroll:
:small_blue_diamond: Become the **best** fisher of all time! :medal:
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
    sendReply(interaction, { embeds: [embed] })
}

module.exports.sendHelpCommand = async function(interaction, user, option) {
    if (option.slice(-1) === 's') { option = option.slice(0, -1); }
    if (!(option in HELP_TEXT)) { return sendReply(interaction, `**${option}** is not a valid option! Use \`/help\` to see a list of valid options.`); }
    
    let embed = HELP_TEXT[option.toLowerCase()], filesArr = [];
    embed.color = logic.color.STATIC.light;
    if (option === 'skin') {
        filesArr = [new MessageAttachment(await createSkinHelpCanvas(), 'skins.png')];
        embed.image = { url: 'attachment://skins.png' }
    }
    sendReply(interaction, { embeds: [embed], files: filesArr });
}

const HELP_TEXT = {
    general: {
        title: 'Help - Detailed Guides for Big Tuna',
        description: `:arrow_right: **First time?** :arrow_left:
See \`/quickstart\`
\n:earth_americas: **General**
\`/help\` - View a list of help commands
\`/help all\` - View all bot commands
\`/help parameters\` - View all bot command options
\`/help settings\` - View personalized bot settings
\n:gear: **Concepts**
\`/help fish\` - Fishing mechanics
\`/help info\` - Game data
\`/help weather\` - Weather
\`/help skin\` - Skins
\`/help score\` - Fisher score
\`/help legendary\` - Legendary fish
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
\`/help boat\` - Clan boat
\n**Helpful Links**
[Invite Big Tuna](https://discord.com/oauth2/authorize?client_id=803361191166607370&permissions=35904&scope=applications.commands%20bot) | \
[Official Discord Server](https://discord.gg/RaN2VE9zpa) | \
[Online Commands Page](https://bigtuna.xyz/commands)`
    },
    all: {
        title: 'Big Tuna Command List',
        description: `:fish: **Gameplay** :fish:
\`/aquarium\` - Check one of your aquariums
\`/aquariums\` - Check all of your aquariums
\`/bait\` - Check your bait
\`/baitshop\` - Shop for bait
\`/bounty\` - Check the weekly bounty
\`/buy\` - Buy from the shop
\`/card\` - Check one of your cards
\`/cards\` - Check all of your cards
\`/collect\` - Collect coins from your aquariums
\`/contributions\` - Check your monetary contributions
\`/cooldowns\` - Check your current cooldowns
\`/equipment\` - Check your equipment
\`/fish\` - Catch fish
\`/give\` - Give something to another player
\`/location\` - View info about a location
\`/locations\` - View all locations and their weather
\`/quest\` - Check/claim/reset your current quest
\`/rankings\` - Check fisher score rankings
\`/ring\` - Check one of your rings
\`/rings\` - Check all of your rings
\`/scores\` - Check fisher scores
\`/servershop\` - Purchase/claim exclusive baits
\`/setlocation\` - Change your fishing location
\`/stats\` - Check stats.
\`/shop\` - Shop for equipment and rings
\`/vote\` - Reset your fishing cooldown
\`/weather\` - View all locations and their weather
\n:trophy: **Rankings** :trophy:
\`/fishleaderboards\` - View leaderboards for a fish species
\`/leaderboards\` - View server leaderboards
\n:dolphin: **Special** :dolphin:
\`/clan\` - Base command for clans (see \`/help clan\`)
\`/help\` - Access help information
\`/info\` - View game data
\`/opt\` - Change the availability of your game information
\`/quickstart\` - Access the quickstart guide
\`/redeem\` - Redeem a server boost to a server
\`/setcustomfish\` - Set a custom fishing word
\`/skin\` - Check one of your skins
\`/skins\` - Check all of your skins
\`/updates\` - View latest game updates`
    },
    parameter: {
        title: 'Big Tuna Command List (Parameters)',
        description: `:fish: **Gameplay** :fish:
\`/aquarium [id (optional)] [user (optional)]\`
\`/aquariums [user (optional)]\`
\`/bait\`
\`/baitshop\`
\`/bounty\`
\`/buy [equipment]\`
\`/card [id] [user (optional)]\`
\`/cards [user (optional)]\`
\`/collect\`
\`/contributions\`
\`/cooldowns\`
\`/equipment [user (optional)]\`
\`/fish [bait (optional)]\`
\`/give [card/ring/skin] [id] [user (optional)]\`
\`/location [id]\`
\`/locations\`
\`/quest [user (optional)]\`
\`/rankings [user (optional)]\`
\`/ring [id] [user (optional)]\`
\`/rings [user (optional)]\`
\`/scores [id] [user (optional)]\`
\`/servershop\`
\`/setlocation [id]\`
\`/stats [player/server/global] [user (player) (optional)]\`
\`/shop\`
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
\`/skins\`
\`/updates\``
    },
    setting: {
        title: 'Toggle Settings',
        description: `All settings can be toggled with the \`/toggle\` command.
To view your current settings, use \`/settings\`.
\n**All Settings**
\`/toggle optin\` - enable/disable other players from viewing your stats
\`/toggle r\` - enable/disable showing the hidden "r" value of caught fish
\`/toggle seed\` - enable/disable showing the hidden "seed" value of caught fish
\n**R vs. Seed**
:seedling: Seed is the initial roll, in the interval \`[0, 1)\` used in determining the tier of your fish. This is before adjustments from bait, weather, and the SS bump are applied.
\n:mag_right: R is the final value, which directly correlates to the weight of your fish. Due to the possible SS bump, the range is extended to \`[0, 1.2)\`.`
    },
    fish: {
        title: 'Fishing Mechanics',
        description: `How good was your catch?
\n**Cooldowns**
You can expect a 1 hour cooldown on this command.
:small_blue_diamond: The only exception to this is for players below Lvl. 10.
:small_blue_diamond: Vote with \`/vote\` to reset your fishing cooldown.
:small_blue_diamond: Big Supporters get Time Accumulation up to 1 hour. (see \`/help supporter\`)
\n**Weight Limit**
Your line will snap and the fish will get away if...
:small_orange_diamond: Fishing Rod cannot support the fish weight
:small_orange_diamond: Fishing Line cannot support the fish weight
:small_orange_diamond: Hook cannot support the fish weight
\n**Sent to Aquarium**
This means that the fish you caught will now appear in your aquarium.
:small_blue_diamond: Message only appears if the fish is a personal best
:small_blue_diamond: The fish will replace your previous best in your aquarium
:small_blue_diamond: You still receive coins and exp for the catch
\n**New Locations**
Each location features around 10 fish, and gets progressively more difficult.
:small_orange_diamond: A new location is unlocked every 10 levels
:small_orange_diamond: View locations with \`/locations\`
:small_orange_diamond: Change your current location with \`setlocation\`
\n**Tiers**
Each fish species has a minimum and maximum size.
Where the fish *you* caught fits in that range determines its tier.
${api.emoji.TIER_S} - Top 10%
${api.emoji.TIER_A} - Top 25%
${api.emoji.TIER_B} - Top 40%
${api.emoji.TIER_C} - Top 70%
${api.emoji.TIER_D} - Bottom 30%
${api.emoji.TIER_SS} - In extreme cases, a fish can spawn beyond its maximum size. 
*There is a 0.8% chance for this, which can be raised to 5% with the right bait.*`
    },
    info: {
        title: 'Accesing Game Data',
        description: `**/info**
\`/info\` is a powerful command that allows access to all sorts of game data.
Use \`/info\` to pull up a menu on how to fully utilize this command.
\n**/location**
\`/location [id]\` will bring up information about a location (fish spawns).
\`/locations\` will bring up an overview of all unlocked locations.`
    },
    weather: {
        title: 'Weather',
        description: `**Weather changes on a daily basis and impacts fish spawns.**
Weather for all locations can be viewed with \`/weather\`.

**Below is a list of all possible weather.**
:sunny: Sunny - Many more small fish. Much lower tiers.
:partly_sunny: Partly Sunny - More small fish. Lower tiers.
:cloud: Cloudy - No effects.
:cloud_rain: Rainy - More large fish. Higher tiers.
:thunder_cloud_rain: Storms - Many more large fish. Much higher tiers.`
    },
    skin: {
        title: 'Skins',
        description: `**Skins are exclusive items that affect the game's visuals**
:small_blue_diamond: Skins are rare collectibles that can be traded.
:small_blue_diamond: All players, regardless of level, can collect skins.
:small_blue_diamond: Skins are mostly community-created from art contests.
\n**How Do I Get Skins?**
You can acquire skins through events.
Giveaways in the [Community Server](https://discord.gg/RaN2VE9zpa) may also reward skins.
\n**Current Skin Types**
:small_blue_diamond: Equipment Banners
:small_blue_diamond: Clan Avatars
\n**My Skins**
Manage and view your skins with \`/skin\` and \`/skins\`.`
    },
    score: {
        title: 'Fisher Score',
        description: `The Fisher Score system is a feature that aims to estimate the quality of your fish collection.
\n**Calculation**
Currently, each fish you have has a score based on tier and rarity.
The sum of those scores is your total fisher score.
\n**Current Uses**
:small_blue_diamond: View with \`/stats player\`
:small_blue_diamond: Server leaderboards with \`/leaderboards score\`
:small_blue_diamond: Global rankings with \`/rankings\`
:small_blue_diamond: Per-location scores with \`/scores\`
\n**Future Updates**
:small_blue_diamond: Rewards at fisher score milestones
:small_blue_diamond: New shop entries at fisher score milestones
:small_blue_diamond: Clan score based on aggregate fisher score`
    },
    legendary: {
        title: 'Legendary Fish',
        description: `These are the rarest species Big Tuna has to offer.
\nBaits and weather work the same as they do with regular fish :fishing_pole_and_fish:
Stormy weather also doubles the chance of catching a Legendary :thunder_cloud_rain:
\n**Spawning Requirements**
A location's legendary fish can only spawn if:
:small_blue_diamond: You have every fish from that location in your aquarium
:small_blue_diamond: Every fish in that aquarium is **A-Tier** or above
\n**All Legendaries Currently in the Game**
Location 1 - Shoal Bass
Location 2 - Black Drum
Location 3 - Golden Koi`
    },
    glove: {
        title: 'Equipment - Gloves',
        description: `Gloves are an equipment type unlocked at Lvl. 10.
\n**Usage**
:small_blue_diamond: Gloves are bought and upgraded in the same way as rods.
:small_blue_diamond: Gloves increase max weight, but only sometimes.
:small_blue_diamond: The activation chance and bonus increase with upgrades.`
    },
    swivel: {
        title: 'Equipment - Swivels',
        description: `Swivels are an equipment type unlocked at Lvl. 50.
\n**Usage**
:small_blue_diamond: Swivels are bought and upgraded in the same way as rods.
:small_blue_diamond: Swivels increase max weight, but only for sharks.`
    },
    ring: {
        title: 'Special Equipment - Rings',
        description: `Rings are a special equipment type unlocked at Lvl. 20.
\n**Rings impact the quantity and quality of card drops.**
You need a ring to have a chance at card drops when fishing.
\n**Rings are bought in the shop in the form of packs.**
${api.emoji.RINGPACK_REGULAR} Regular packs give 1 ring.
${api.emoji.RINGPACK_PREMIUM} Premium packs give 1 ring of higher quality.
At levels 20, 40, 60, 80, 100 the price and quality of packs increases.
\n**Stats**
:small_blue_diamond:  Every ring has unique **size drop** stats (eg. S: 1%, M: 2%, L: 1.5%, XL: 1%).
:small_blue_diamond: This represents the chance of a card dropping for each fish size class.
:small_orange_diamond: Every ring has unique **grade chance** stats.
:small_orange_diamond: This represents the chance a card is a certain grade. (see \`/help card\`)
:small_blue_diamond: Rings also have abilities that are unique to their material.
\n**Commands**
\`/shop\` to buy rings
\`/ring\` to view/equip/sell one of your rings
\`/rings\` to view all of your rings
\`/give ring\` to give away one of your rings
\`/info rings\` to view ring game data`
    },
    card: {
        title: 'Fish Cards',
        description: `Cards are a feature unlocked at Lvl. 20.
Cards can be given, sold for :lollipop: or redeemed to your aquarium.
\n**Getting Cards**
:small_blue_diamond: When fishing, sometimes the fish "drops" a card.
:small_blue_diamond: The chance of this happening depends on your ring.
:small_blue_diamond: You *must* have a ring to get fish cards.
\n**Grades**
Cards each have a Meat Quality, which affects the sell price.
:rock: Consumer Grade - x1
:fried_shrimp: Premium Grade - x1.5
:sushi: Sashimi Grade - x4
:trophy: Trophy Grade - x10
\n**Commands**
\`/card\` to view/sell/redeem one of your cards
\`/cards\` to view all of your cards
\`/give card\` to give away one of your cards`
    },
    quest: {
        title: 'Quests & Bounties',
        description: `Quests and bounties are unlocked at Lvl. 10.
\n**Overview**
Quests and bounties both serve as ways to acquire :lollipop:
Statistically, bounties are more rewarding.
\n**Quests**
:small_blue_diamond: View with \`/quest\`
:small_blue_diamond: Individual to you, can be rerolled after 3 days
\n**Bounties**
:small_orange_diamond: View with \`/bounty\`
:small_orange_diamond: Global, refreshes on a weekly basis`
    },
    bait: {
        title: 'Bait - Fishing in Luxury',
        description: `Baits are unlocked at Lvl. 10.
\n**Overview**
Baits are purchased with :lollipop:
Baits manipulate fish spawns when you fish.
Baits are bought from the bait shop, which changes on a daily basis.

**Server Shop**
Premium Servers (see \`/help supporter\`) get access to a special shop.
This shop contains special 4-star baits or discounted regular baits.
Players in that server may purchase once a week from each server's shop.
Each server's shop is unique and is refreshed on a weekly basis.
\n*The Community Server is a great way to access a server shop!*
\n**Commands**
\`/bait\` to view your bait
\`/baitshop\` to purchase bait
\`/servershop\` to purchase/claim bait from the server shop
\`/fish [bait]\` to use bait
\`/info bait\` to see all possible baits
\n*Tip: Use \`/info\` to determine whether a bait shop deal is good or not!*`
    },
    supporter: {
        title: 'Supporter Perks',
        description: `**If you enjoy Big Tuna and want to be part of its growth...**
Support the bot with a small donation!
\n:sushi: **Supporter - $1.50** :sushi:
- Get a cool sashimi-colored border on a variety of commands.
- Get a custom Supporter role in the Big Tuna Community Server.
\n:trophy: **Big Supporter - $10.00** :trophy:
- Get an epic gold border on a variety of commands.
- Get a custom Big Supporter role in the Big Tuna Community Server.
- Gain the **Time Accumulation** perk.
- This lets you use missed time (up to 1 hour) on your next catch.
- Gift extra copies of Big Supporter with the \`/give supporter\` command.
\n:sparkles: **Premium Server - $20.00** :sparkles:
- Giftable status will appear in your stats page
- Use \`/redeem\` in a server of your choosing to make it a Premium Server.
- Will increase server tier and unlock another shop slot if already Premium.
- Entire server will gain access to the \`/servershop\` command.
- Get exclusive 4-star baits once a week or free regular bait.
- Each server has a unique server shop every week.
- Server will get an epic golden border on server-based commands.
- Server mods will be able to map any word to \`/fish\` using \`/customfish [word]\`
\n*Use \`/contributions\` for a personal summary of purchases.*
\n**Links**
[Big Tuna Shop](https://bigtuna.xyz/shop) | [Community Server](https://discord.gg/RaN2VE9zpa)`
    },
    clan: {
        title: 'Clans',
        description: `**Clans are a great way to fish alongside your friends!**
Join a fishing clan for exclusive rewards, perks, and competitions!
There are 3 roles within a clan: **Member**, **Trusted Member** :reminder_ribbon:, and **Leader** :crown:
A clan's experience is determined by the quantity of fish caught :fish:
Find a clan to join with \`/clan board\`!
\n**Campaign**
A questline to complete as a clan, accessed with \`/clan campaign\`.
:small_blue_diamond: Each player may contribute one catch per day
:small_blue_diamond: Campaign stages may not be skipped
:small_blue_diamond: New clan members cannot contribute to the campaign.
:small_blue_diamond: Players below Lvl. 10 cannot contribute to the campaign.
\n**Activity Markers**
In the clan profile page, activity markers are provided.
:green_square: **Active** - Last fished under 7 days ago
:yellow_square: **Semi Active** - Last fished under 2 weeks ago
:red_square: **Inactive** - Last fished over 2 weeks ago
:blue_square: **Active & Contributed** - Contributed to campaign today
:white_large_square: **Joined Today** - Cannot contribute to campaign
\n**Perks (Accumulative)**
:star: (<100 :fish:): ***-1%** fishing cooldown*
:star::star: (<500 :fish:): ***+2%** coins per catch*
:star::star::star: (<2000 :fish:): ***+2%** exp per catch*
:star::star::star::star: (<10000 :fish:): ***2 day** quest reroll timer*
:star::star::star::star::star: (<50000 :fish:): ***+5%** aquarium coin capacity*
:star::star::star::star::star::star: (50000+ :fish:): ***+5%** max weight*
\n**Clan Commands**
\`/clan profile\` - View your clan page
\`/clan members\` - View info about your clan members
\`/clan board\` - Find clans to join
\`/clan campaign\` - View clan campaign status
\`/clan shop\` - Visit the clan shop
\`/clan buy\` - Purchase perks from the clan shop
\`/clan perks\` - View summary of clan perks
\`/clan create\` - Create a new clan (Lvl. 20, 5000 coins)
\`/clan rename\` - Rename your clan (you have limited renames)
\`/clan join\` - Join a clan
\`/clan leave\` - Leave a clan
:reminder_ribbon: \`/clan password\` - Manage clan password
:reminder_ribbon: \`/clan promote\` - Promote someone
:reminder_ribbon: \`/clan demote\` - Demote someone
:reminder_ribbon: \`/clan kick\` - Kick someone`
    },
    boat: {
        title: 'Clan Boat',
        description: `**The clan boat is an excellent source of passive income for your clan!**
The Clan Boat is shared, maintained, and upgraded by your clan members.
\n**Usage**
1. A Trusted Member :reminder_ribbon: or the Leader :crown: sends off the boat with \`/clan boat\`
2. Wait for the boat to finish fishing (see progress with \`/clan boat\`)
3. When the boat returns, clan members claim boat rewards with \`/clan boat\`
4. After 24 hours of unloading, the boat is ready to be sent again
\n**Upgrades**
Upgrades/fuel is sourced from clan member's cards.
To contribute, use \`/card\` and press the appropriate button.
You cannot contribute to the boat while it is in use.
Member contributions can be seen with \`/clan members\`.
*For more information, use the \`/info\` command.*
\n:oil: Fuel converts at 1 :lollipop: per unit, and can be any card
${api.emoji.CLANBOAT_HULL} Hull is upgraded with **trophy grade** cards
${api.emoji.CLANBOAT_CONTAINER} Container is upgraded with **sashimi grade** cards
${api.emoji.CLANBOAT_ENGINE} Engine is upgraded with **premium grade** cards
${api.emoji.CLANBOAT_PROPELLER} Propeller is upgraded with **consumer grade** cards
\n**Rewards**
Some useful things to know:
- Fish caught from the boat **can** go to your aquarium
- Fish caught from the boat **can** contribute to clan campaigns
- Fish caught from the boat **can** contribute to quests & bounties
- Fish caught from the boat **can** drop cards (set boat ring with \`/ring\`)`
    }
};