// Handle All Tutorial-Related Commands
// # --------------------------------
const db = require('../../db');
const logic = require('../logic');

const { sendReply } = require('../misc/reply.js');


module.exports.sendTutorialOne = async function(interaction, user) {
    if (interaction.customFishTweaked) { return; }

    if (user.tutorial === 0) { db.users.setColumn(user.userid, 'tutorial', 1); }

    const EMBED_ONE = {
        color: logic.color.STATIC.tuna,
        title: 'Welcome to Big Tuna!',
        author: {
            name: `${interaction.user.tag} (Lvl. ${user.level})`,
            icon_url: interaction.user.displayAvatarURL()
        },
        description: `We'll walk you through the first little bit.
\n**Step 1 - Go Fish!**
Type \`/fish\` or \`.f\` to cast your line.`
    };

    sendReply(interaction, { embeds: [EMBED_ONE] });
}

module.exports.getTutorialTwoEmbed = async function(interaction, user) {
    if (user.tutorial === 1) { db.users.setColumn(user.userid, 'tutorial', 2); }

    const EMBED_TWO = {
        color: logic.color.STATIC.tuna,
        title: 'Nice Cast!',
        author: {
            name: `${interaction.user.tag} (Lvl. ${user.level})`,
            icon_url: interaction.user.displayAvatarURL()
        },
        description: `Let's check the coins and exp we just gained.
\n**Step 2 - Check Stats**
Type \`/stats player\` or \`.s\` to check your stats.`
    }

    return EMBED_TWO;
}

module.exports.getTutorialThreeEmbed = async function(interaction, user) {
    if (user.tutorial === 2) { db.users.setColumn(user.userid, 'tutorial', 3); }
    
    const EMBED_THREE = {
        color: logic.color.STATIC.tuna,
        title: 'Good Job!',
        author: {
            name: `${interaction.user.tag} (Lvl. ${user.level})`,
            icon_url: interaction.user.displayAvatarURL()
        },
        description: `Collect exp to level up. Levelling up gives you access to more equipment, locations, and features.
\nLet's check on the aquarium now.
\n**Step 3 - Check Aquarium**
Type \`/aquarium\` or \`.a\` to check your aquarium.`
    };

    return EMBED_THREE;
}

module.exports.getTutorialFourEmbed = async function(interaction, user) {
    if (user.tutorial === 3) { db.users.setColumn(user.userid, 'tutorial', 4); }

    const EMBED_FOUR = {
        color: logic.color.STATIC.tuna,
        title: 'Good Stuff!',
        author: {
            name: `${interaction.user.tag} (Lvl. ${user.level})`,
            icon_url: interaction.user.displayAvatarURL()
        },
        description: `The Aquarium serves as a record book of your best catches. There is one for each location. You can also collect coins by typing \`/collect\` or \`.c\`
\nLast step: Let's look at your equipment.
\n**Step 4 - Check Equipment**
Type \`/equipment\` or \`.e\` to check your equipment.`
    };

    return EMBED_FOUR;
}

module.exports.getTutorialFiveEmbed = async function(interaction, user) {
    if (user.tutorial === 4) { db.users.setColumn(user.userid, 'tutorial', 5); }

    const EMBED_FIVE = {
        color: logic.color.STATIC.tuna,
        title: 'Get to Level 10!',
        author: {
            name: `${interaction.user.tag} (Lvl. ${user.level})`,
            icon_url: interaction.user.displayAvatarURL()
        },
        description: `With equipment, you're only as strong as your weakest link!
\nAnyways, do your best to get to Level 10, after which you will officially be done the tutorial. It's unlimited fishing until Level 10!
\n**Helpful Commands:**
\`/shop\` or \`.shop\`
\`/help\` or \`.help\`
\`/cooldowns\` or \`.cd\``
    };

    return EMBED_FIVE;
}

module.exports.getTutorialSixEmbed = async function(interaction, user) {

    const EMBED_SIX = {
        color: logic.color.STATIC.tuna,
        title: 'Congratulations on reaching level 10!',
        author: {
            name: `${interaction.user.tag} (Lvl. ${user.level})`,
            icon_url: interaction.user.displayAvatarURL()
        },
        description: `You have been given 50 :lollipop:\n
As of today, you have officially begun your Big Tuna journey.
There will now be a cooldown on fishing, just like all other Lvl. 10+ players.\n\n**Here are some last tips:**
:small_blue_diamond: Fish in a new location with \`/setlocation 2\` or \`.sl 2\`
:small_blue_diamond: Check out the Lvl. 10+ section in from the help menu
:small_blue_diamond: Join a clan for great perks (or start one when you get to Lvl. 20)
:small_blue_diamond: Buy bait with \`/baitshop\` or \`.bs\`
:small_blue_diamond: Educate yourself with \`/help bait\` or \`.help bait\`
:small_blue_diamond: Reset your cooldown with \`/vote\` or \`.vote\`
:small_blue_diamond: Join the [Official Community Server](https://discord.gg/RaN2VE9zpa)`
    };

    return EMBED_SIX;
}