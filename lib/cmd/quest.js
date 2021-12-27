// Handle "quest", "questclaim", "questreset" Command
// # ---------------------------------------------- #

const api = require('../../api');
const db = require('../../db');
const logic = require('../logic');

const { getQuestReward } = require('../misc/calculations.js');

module.exports.sendQuestCommand = async function(interaction, user) {
    // QUEST
    // Step 1 - Validate Command Call
    let mentionedUser = interaction.options.getUser('user') || interaction.user;
    if (mentionedUser && mentionedUser.id !== interaction.user.id) {
        if (mentionedUser.bot) {
            return interaction.reply(`**${mentionedUser.username}** is a bot and cannot have a Big Tuna account!`);
        }
        user = await db.users.fetchUser(mentionedUser.id);
        if (!user) {
            return interaction.reply(`**${mentionedUser.username}** has not used Big Tuna before!`);
        } else if (!user.opted_in) {
            return interaction.reply(`**${mentionedUser.username}** is not opted in! They must use the \`optin\` command to make their stats publicy visible.`);
        }
    }

    // Step 2 - Level Requirements
    if (user.level < 10) {
        let embed = {
            color: logic.color.STATIC.default,
            title: 'No Quest',
            author: {
                name: `${mentionedUser.username}#${interaction.user.discriminator} (Lvl. ${user.level})`,
                icon_url: mentionedUser.displayAvatarURL()
            },
            description: 'Quests are unlocked at player level 10!'
        };
        return interaction.reply({ embeds: [embed] });
    }

    // Step 3 - Generate Quest (if needed)
    if (user.quest_type === -1) {
        const clan = await db.clan.fetchClan(user.clan);
        let rewardMultiplier = 1;
        if (clan && clan.quest_mba) {
            rewardMultiplier += api.clan.getPerkValue('quest_mba', clan.quest_mba)/100;
        }
        let quest = await logic.generation.generateQuest(user.level, rewardMultiplier);
        user = await db.users.setQuest(user.userid, quest);
    }

    // Step 4 - Fetch Information
    const clan = await db.clan.fetchClan(user.clan);
    const cooldownReduction = logic.clan.hasCooldownReduction(clan);
    const questCooldown = (cooldownReduction ? 2 : 3) * 86400000;

    // Step 5 - Send Embed
    let embedTitle, progressString, embedDescription;
    switch (user.quest_type) {
        case 0:
            const tier = api.quest.getQuestData(0).tiers[user.quest_data];
            embedTitle = `Tier Quest - Catch ${user.quest_requirement} fish of ${tier} tier or higher`;
            progressString = `${user.quest_progress}/${user.quest_requirement}`;
            break;
        case 1:
            embedTitle = `Kg Quest - Catch ${logic.text.kgToWeight(user.quest_requirement)} of fish`;
            progressString = `${user.quest_progress}/${logic.text.kgToWeight(user.quest_requirement)}`;
            break;
        case 2:
            const fishData = api.fish.getFishData(user.quest_data);
            embedTitle = `Bounty Quest - Catch ${user.quest_requirement} ${logic.text.capitalizeWords(fishData.name)}`;
            progressString = `${user.quest_progress}/${user.quest_requirement}`;
            break;
        case 3:
            embedTitle = `Collect Quest - Collect ${user.quest_requirement} coins from your aquariums`;
            progressString = `${user.quest_progress}/${user.quest_requirement}`;
            break;
        case 4:
            const baitName = api.bait.getBaitNameById(user.quest_data);
            embedTitle = `Bait Quest - Use ${logic.text.capitalizeWords(baitName)} ${user.quest_requirement} times`;
            progressString = `${user.quest_progress}/${user.quest_requirement}`;
            break;
        default:
            break;
    }

    if (user.quest_progress === user.quest_requirement) { // quest done; can claim
        embedDescription = 'Quest complete! :white_check_mark:\nClaim your reward with the `questclaim` command!';
    } else if (Date.now() - user.quest_start >= questCooldown) { // can reset
        embedDescription = 'You may reset your quest with the `questreset` command.';
    } else { // cannot reset
        embedDescription = `You may reset your quest when it is ${cooldownReduction ? 48 : 72} hours old.`;
    }

    let embed = {
        color: logic.color.STATIC.quest[user.quest_type],
        title: embedTitle,
        author: {
            name: `${mentionedUser.username}#${interaction.user.discriminator} (Lvl. ${user.level})`,
            icon_url: mentionedUser.displayAvatarURL()
        },
        description: embedDescription,
        fields: [
            {name: 'Progress', value: progressString, inline: true},
            {name: 'Reward', value: `${user.quest_reward} :lollipop:`, inline: true},
            {name: 'Quest Age', value: `${logic.time.millisToHoursAndMinutes(Date.now() - user.quest_start)}`, inline: true}
        ]
    };
    interaction.reply({ embeds: [embed] });
}

module.exports.sendQuestClaimCommand = async function(interaction, user) {
    // QUESTCLAIM
    // Step 1 - Level Requirements
    if (user.level < 10) {
        let embed = {
            color: logic.color.STATIC.default,
            title: 'No Quest',
            author: {
                name: `${interaction.user.username}#${interaction.user.discriminator} (Lvl. ${user.level})`,
                icon_url: interaction.user.displayAvatarURL()
            },
            description: 'Quests are unlocked at player level 10!'
        };
        return interaction.reply({ embeds: [embed] });
    }

    // Step 2 - Validate Quest is Claimable
    if (user.quest_progress !== user.quest_requirement) {
        let embed = {
            color: logic.color.STATIC.default,
            title: 'Quest Incomplete',
            author: {
                name: `${interaction.user.username}#${interaction.user.discriminator} (Lvl. ${user.level})`,
                icon_url: interaction.user.displayAvatarURL()
            },
        description: 'Check your quest with the `quest` command.'
        }
        return interaction.reply({ embeds: [embed] });
    }

    // Step 3 - Update Database + Generate New Quest
    const updateInstructions = { lollipops: user.quest_reward };
    await db.users.updateColumns(user.userid, updateInstructions);
    const oldQuestReward = user.quest_reward;

    const clan = await db.clan.fetchClan(user.clan);
    let rewardMultiplier = 1;
    if (clan && clan.quest_mba) { rewardMultiplier += api.clan.getPerkValue('quest_mba', clan.quest_mba)/100; }
    let quest = await logic.generation.generateQuest(user.level, rewardMultiplier);
    user = await db.users.setQuest(user.userid, quest);

    // Step 4 - Send Embeds
    let embed1 = {
        color: logic.color.STATIC.tuna,
        title: `Claimed ${oldQuestReward} :lollipop:`,
        author: {
            name: `${interaction.user.username}#${interaction.user.discriminator} (Lvl. ${user.level})`,
            icon_url: interaction.user.displayAvatarURL()
        },
        description: `You now have ${user.lollipops} :lollipop:\nYour new quest is shown below.`
    };

    const cooldownReduction = logic.clan.hasCooldownReduction(clan);
    let embedTitle;
    switch (user.quest_type) {
        case 0:
            const tier = api.quest.getQuestData(0).tiers[user.quest_data];
            embedTitle = `Tier Quest - Catch ${user.quest_requirement} fish of ${tier} tier or higher`;
            progressString = `0/${user.quest_requirement}`;
            break;
        case 1:
            embedTitle = `Kg Quest - Catch ${logic.text.kgToWeight(user.quest_requirement)} of fish`;
            progressString = `0/${logic.text.kgToWeight(user.quest_requirement)}`;
            break;
        case 2:
            const fishData = api.fish.getFishData(user.quest_data);
            embedTitle = `Bounty Quest - Catch ${user.quest_requirement} ${logic.text.capitalizeWords(fishData.name)}`;
            progressString = `0/${user.quest_requirement}`;
            break;
        case 3:
            embedTitle = `Collect Quest - Collect ${user.quest_requirement} coins from your aquariums`;
            progressString = `0/${user.quest_requirement}`;
            break;
        case 4:
            const baitName = api.bait.getBaitNameById(user.quest_data);
            embedTitle = `Bait Quest - Use ${logic.text.capitalizeWords(baitName)} ${user.quest_requirement} times`;
            progressString = `0/${user.quest_requirement}`;
            break;
        default:
            break;
    }

    let embed2 = {
        color: logic.color.STATIC.quest[user.quest_type],
        title: embedTitle,
        author: {
            name: `${interaction.user.username}#${interaction.user.discriminator} (Lvl. ${user.level})`,
            icon_url: interaction.user.displayAvatarURL()
        },
        description: `You may reset your quest when it is ${cooldownReduction ? 48 : 72} hours old.`,
        fields: [
            {name: 'Progress', value: progressString, inline: true},
            {name: 'Reward', value: `${user.quest_reward} :lollipop:`, inline: true},
            {name: 'Quest Age', value: '0 minutes', inline: true}
        ]
    };

    interaction.reply({ embeds: [embed1, embed2] });
}

module.exports.sendQuestResetCommand = async function(interaction, user) {
    // QUESTRESET
    // Step 1 - Level Requirements
    if (user.level < 10) {
        let embed = {
            color: logic.color.STATIC.default,
            title: 'No Quest',
            author: {
                name: `${interaction.user.username}#${interaction.user.discriminator} (Lvl. ${user.level})`,
                icon_url: interaction.user.displayAvatarURL()
            },
            description: 'Quests are unlocked at player level 10!'
        };
        return interaction.reply({ embeds: [embed] });
    }

    // Step 2 - Validate Quest is Resettable
    if (user.quest_progress === user.quest_requirement) {
        let embed = {
            color: logic.color.STATIC.default,
            title: 'Quest Already Complete',
            author: {
                name: `${interaction.user.username}#${interaction.user.discriminator} (Lvl. ${user.level})`,
                icon_url: interaction.user.displayAvatarURL()
            },
        description: 'Claim your quest reward with the `questclaim` command!'
        }
        return interaction.reply(embed);
    }
    const clan = await db.clan.fetchClan(user.clan);
    const cooldownReduction = logic.clan.hasCooldownReduction(clan);
    const questCooldown = (cooldownReduction ? 2 : 3) * 86400000;
    if (Date.now() - user.quest_start < questCooldown) {
        let embed = {
            color: logic.color.STATIC.default,
            title: 'Quest Cannot Be Reset Yet',
            author: {
                name: `${interaction.user.username}#${interaction.user.discriminator} (Lvl. ${user.level})`,
                icon_url: interaction.user.displayAvatarURL()
            },
        description: `Please wait until ${cooldownReduction ? 48 : 72} hours have passed before resetting your quest!`
        }
        return interaction.reply({ embeds: [embed] });
    }

    // Step 3 - Update Database + Generate New Quest
    let rewardMultiplier = 1;
    if (clan && clan.quest_mba) { rewardMultiplier += api.clan.getPerkValue('quest_mba', clan.quest_mba)/100; }
    let quest = await logic.generation.generateQuest(user.level, rewardMultiplier);
    user = await db.users.setQuest(user.userid, quest);

    // Step 4 - Send Embeds
    let embed1 = {
        color: logic.color.STATIC.tuna,
        title: `Successfully Reset Quest!`,
        author: {
            name: `${interaction.user.username}#${interaction.user.discriminator} (Lvl. ${user.level})`,
            icon_url: interaction.user.displayAvatarURL()
        },
        description: `Your new quest is shown below.`
    };

    let embedTitle;
    switch (user.quest_type) {
        case 0:
            const tier = api.quest.getQuestData(0).tiers[user.quest_data];
            embedTitle = `Tier Quest - Catch ${user.quest_requirement} fish of ${tier} tier or higher`;
            progressString = `0/${user.quest_requirement}`;
            break;
        case 1:
            embedTitle = `Kg Quest - Catch ${logic.text.kgToWeight(user.quest_requirement)} of fish`;
            progressString = `0/${logic.text.kgToWeight(user.quest_requirement)}`;
            break;
        case 2:
            const fishData = api.fish.getFishData(user.quest_data);
            embedTitle = `Bounty Quest - Catch ${user.quest_requirement} ${logic.text.capitalizeWords(fishData.name)}`;
            progressString = `0/${user.quest_requirement}`;
            break;
        case 3:
            embedTitle = `Collect Quest - Collect ${user.quest_requirement} coins from your aquariums`;
            progressString = `0/${user.quest_requirement}`;
            break;
        case 4:
            const baitName = api.bait.getBaitNameById(user.quest_data);
            embedTitle = `Bait Quest - Use ${logic.text.capitalizeWords(baitName)} ${user.quest_requirement} times`;
            progressString = `0/${user.quest_requirement}`;
            break;
        default:
            break;
    }

    let embed2 = {
        color: logic.color.STATIC.quest[user.quest_type],
        title: embedTitle,
        author: {
            name: `${interaction.user.username}#${interaction.user.discriminator} (Lvl. ${user.level})`,
            icon_url: interaction.user.displayAvatarURL()
        },
        description: `You may reset your quest when it is ${cooldownReduction ? 48 : 72} hours old.`,
        fields: [
            {name: 'Progress', value: progressString, inline: true},
            {name: 'Reward', value: `${user.quest_reward} :lollipop:`, inline: true},
            {name: 'Quest Age', value: '0 minutes', inline: true}
        ]
    };

    interaction.reply({ embeds: [embed1, embed2] });
}