// Handle "quest", "questclaim", "questreset" Command
// # ---------------------------------------------- #

const { MessageActionRow, MessageButton } = require('discord.js');

const api = require('../../api');
const db = require('../../db');
const logic = require('../logic');

const { sendReply } = require('../misc/reply.js');

module.exports.sendQuestCommand = async function(interaction, user, mentionedUser) {
    user.quest_start = parseInt(user.quest_start);
    // QUEST
    // Step 1 - Validate Command Call
    let USER_MENTIONED = false;
    if (mentionedUser && mentionedUser.id !== interaction.user.id) {
        USER_MENTIONED = true;
        if (mentionedUser.bot) {
            return sendReply(interaction, `**${mentionedUser.username}** is a bot and cannot have a Big Tuna account!`);
        }
        user = await db.users.fetchUser(mentionedUser.id);
        if (!user) {
            return sendReply(interaction, `**${mentionedUser.username}** has not used Big Tuna before!`);
        } else if (!user.opted_in) {
            return sendReply(interaction, `**${mentionedUser.username}** is not opted in! They must use the \`/optin\` command to make their stats publicy visible.`);
        }
    }

    // Step 2 - Level Requirements
    if (user.level < 10) {
        let embed = {
            color: logic.color.STATIC.default,
            title: 'No Quest',
            author: {
                name: `${mentionedUser.tag} (Lvl. ${user.level})`,
                icon_url: mentionedUser.displayAvatarURL()
            },
            description: 'Quests are unlocked at player level 10!'
        };
        return sendReply(interaction, { embeds: [embed] });
    }

    // Step 3 - Generate Quest (if needed)
    if (user.quest_type === -1) {
        const clan = await db.clan.fetchClanByUserid(user.userid);
        let rewardMultiplier = 1;
        if (clan && clan.quest_mba) {
            rewardMultiplier += api.clan.getPerkValue('quest_mba', clan.quest_mba)/100;
        }
        let quest = await logic.generation.generateQuest(user.level, rewardMultiplier);
        user = await db.users.setQuest(user.userid, quest);
    }

    // Step 4 - Fetch Information
    const clan = await db.clan.fetchClanByUserid(user.userid);
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
            embedTitle = `Kg Quest - Catch ${logic.text.kgToWeight(user.quest_requirement/1000)} of fish`;
            progressString = `${user.quest_progress/1000}/${logic.text.kgToWeight(user.quest_requirement/1000)}`;
            break;
        case 2:
            const FishData = api.fish.getFishData(user.quest_data);
            embedTitle = `Bounty Quest - Catch ${user.quest_requirement} ${logic.text.capitalizeWords(FishData.name.replace(/_/g, ' ').replace(/_/g, ' '))}`;
            progressString = `${user.quest_progress}/${user.quest_requirement}`;
            break;
        case 3:
            embedTitle = `Collect Quest - Collect ${user.quest_requirement} coins from your aquariums`;
            progressString = `${user.quest_progress}/${user.quest_requirement}`;
            break;
        case 4:
            const baitName = api.bait.getBaitNameById(user.quest_data);
            embedTitle = `Bait Quest - Use ${logic.text.capitalizeWords(baitName.replace(/_/g, ' '))} ${user.quest_requirement} times`;
            progressString = `${user.quest_progress}/${user.quest_requirement}`;
            break;
        default:
            break;
    }

    if (user.quest_progress === user.quest_requirement) { // quest done; can claim
        embedDescription = 'Quest complete! Claim your reward!';
    } else if (Date.now() - user.quest_start < questCooldown) { // cannot reset
        embedDescription = `You may reset your quest when it is ${cooldownReduction ? 48 : 72} hours old.`;
    }

    let embed = {
        color: logic.color.STATIC.quest[user.quest_type],
        title: embedTitle,
        author: {
            name: `${mentionedUser.tag} (Lvl. ${user.level})`,
            icon_url: mentionedUser.displayAvatarURL()
        },
        description: embedDescription,
        fields: [
            {name: 'Progress', value: progressString, inline: true},
            {name: 'Reward', value: `${user.quest_reward} :lollipop:`, inline: true},
            {name: 'Quest Age', value: `${logic.text.millisToHoursAndMinutes(Date.now() - user.quest_start)}`, inline: true}
        ]
    };

    let claimButton, resetButton;
    let rowArr = []
    if (!USER_MENTIONED) {
        claimButton = new MessageButton().setCustomId(`${interaction.id} claim`).setLabel('Claim').setStyle('SUCCESS');
        resetButton = new MessageButton().setCustomId(`${interaction.id} reset`).setLabel('Reset').setStyle('SECONDARY');
        if (user.quest_progress !== user.quest_requirement) { claimButton.setDisabled(true); }
        if (user.quest_progress === user.quest_requirement || Date.now() - user.quest_start < questCooldown) { resetButton.setDisabled(true); }
        rowArr = [new MessageActionRow().addComponents(claimButton, resetButton)];
    }

    sendReply(interaction, { embeds: [embed], components: rowArr }).then(async (sentMessage) => {
        const filter = i => i.customId.split(' ')[0] === interaction.id;

        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 10000 });

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) { return i.reply({ content: 'That button is not for you!', ephemeral: true }); }
            collector.stop();

            const action = i.customId.split(' ')[1];
            let embeds;
            if (action === 'claim') {
                embeds = await handleClaimButton(user, interaction.user, clan);
            } else {
                embeds = await handleResetButton(user, interaction.user, clan);
            }
            await i.update({ embeds: [embed, ...embeds], components: [] });
        });

        collector.on('end', (collected, reason) => {
            if (reason === 'time') {
                if (interaction.constructor.name === 'Message') { return sentMessage.edit({ embeds: [embed], components: [] }); }
                interaction.editReply({ embeds: [embed], components: [] });
            }
        });
    });
}

async function handleClaimButton(user, author, clan) {
    // QUESTCLAIM
    // Re-Validate Quest is Claimable
    const newUser = await db.users.fetchUser(user.userid);
    if (newUser.quest_progress !== newUser.quest_requirement) {
        return [{
            color: logic.color.STATIC.failure,
            title: 'Quest Incomplete'
        }];
    }

    // Update Database + Generate New Quest
    const updateInstructions = { lollipops: newUser.quest_reward };
    await db.users.updateColumns(user.userid, updateInstructions);
    const oldQuestReward = newUser.quest_reward;

    const cooldownReduction = logic.clan.hasCooldownReduction(clan);
    let rewardMultiplier = 1;
    if (clan && clan.quest_mba) { rewardMultiplier += api.clan.getPerkValue('quest_mba', clan.quest_mba)/100; }
    let quest = await logic.generation.generateQuest(user.level, rewardMultiplier);
    const newQuest = await db.users.setQuest(user.userid, quest);

    // Return Embeds
    let embed2 = {
        color: logic.color.STATIC.quest[user.quest_type],
        title: `Claimed ${oldQuestReward} :lollipop:`,
        description: `You now have ${user.lollipops + oldQuestReward} :lollipop:\nYour new quest is shown below.`
    };

    let embedTitle, progressString;
    switch (newQuest.quest_type) {
        case 0:
            const tier = api.quest.getQuestData(0).tiers[newQuest.quest_data];
            embedTitle = `Tier Quest - Catch ${newQuest.quest_requirement} fish of ${tier} tier or higher`;
            progressString = `0/${newQuest.quest_requirement}`;
            break;
        case 1:
            embedTitle = `Kg Quest - Catch ${logic.text.kgToWeight(newQuest.quest_requirement/1000)} of fish`;
            progressString = `0/${logic.text.kgToWeight(newQuest.quest_requirement/1000)}`;
            break;
        case 2:
            const FishData = api.fish.getFishData(newQuest.quest_data);
            embedTitle = `Bounty Quest - Catch ${newQuest.quest_requirement} ${logic.text.capitalizeWords(FishData.name.replace(/_/g, ' '))}`;
            progressString = `0/${newQuest.quest_requirement}`;
            break;
        case 3:
            embedTitle = `Collect Quest - Collect ${newQuest.quest_requirement} coins from your aquariums`;
            progressString = `0/${newQuest.quest_requirement}`;
            break;
        case 4:
            const baitName = api.bait.getBaitNameById(newQuest.quest_data);
            embedTitle = `Bait Quest - Use ${logic.text.capitalizeWords(baitName.replace(/_/g, ' '))} ${newQuest.quest_requirement} times`;
            progressString = `0/${newQuest.quest_requirement}`;
            break;
        default:
            break;
    }

    let embed3 = {
        color: logic.color.STATIC.quest[newQuest.quest_type],
        title: embedTitle,
        author: {
            name: `${author.tag} (Lvl. ${user.level})`,
            icon_url: author.displayAvatarURL()
        },
        description: `You may reset your quest when it is ${cooldownReduction ? 48 : 72} hours old.`,
        fields: [
            {name: 'Progress', value: progressString, inline: true},
            {name: 'Reward', value: `${newQuest.quest_reward} :lollipop:`, inline: true},
            {name: 'Quest Age', value: '0 minutes', inline: true}
        ]
    };

    return [embed2, embed3];
}

async function handleResetButton(user, author, clan) {
    // QUESTRESET
    // Re-Validate Quest is Resettable (aka the same as before)
    const newUser = await db.users.fetchUser(user.userid);
    newUser.quest_start = parseInt(newUser.quest_start);
    if (user.quest_start !== newUser.quest_start) {
        return [{
            color: logic.color.STATIC.failure,
            title: 'Cannot Reset Quest',
            description: 'You have already reset your quest!'
        }];
    }

    // Update Database + Generate New Quest
    const cooldownReduction = logic.clan.hasCooldownReduction(clan);
    let rewardMultiplier = 1;
    if (clan && clan.quest_mba) { rewardMultiplier += api.clan.getPerkValue('quest_mba', clan.quest_mba)/100; }
    let quest = await logic.generation.generateQuest(user.level, rewardMultiplier);
    const newQuest = await db.users.setQuest(user.userid, quest);

    // Return Embeds
    let embed2 = {
        color: logic.color.STATIC.quest[user.quest_type],
        title: `Successfully Reset Quest!`,
        description: `Your new quest is shown below.`
    };

    let embedTitle, progressString;
    switch (newQuest.quest_type) {
        case 0:
            const tier = api.quest.getQuestData(0).tiers[newQuest.quest_data];
            embedTitle = `Tier Quest - Catch ${newQuest.quest_requirement} fish of ${tier} tier or higher`;
            progressString = `0/${newQuest.quest_requirement}`;
            break;
        case 1:
            embedTitle = `Kg Quest - Catch ${logic.text.kgToWeight(newQuest.quest_requirement/1000)} of fish`;
            progressString = `0/${logic.text.kgToWeight(newQuest.quest_requirement/1000)}`;
            break;
        case 2:
            const FishData = api.fish.getFishData(newQuest.quest_data);
            embedTitle = `Bounty Quest - Catch ${newQuest.quest_requirement} ${logic.text.capitalizeWords(FishData.name.replace(/_/g, ' '))}`;
            progressString = `0/${newQuest.quest_requirement}`;
            break;
        case 3:
            embedTitle = `Collect Quest - Collect ${newQuest.quest_requirement} coins from your aquariums`;
            progressString = `0/${newQuest.quest_requirement}`;
            break;
        case 4:
            const baitName = api.bait.getBaitNameById(newQuest.quest_data);
            embedTitle = `Bait Quest - Use ${logic.text.capitalizeWords(baitName.replace(/_/g, ' '))} ${newQuest.quest_requirement} times`;
            progressString = `0/${newQuest.quest_requirement}`;
            break;
        default:
            break;
    }

    let embed3 = {
        color: logic.color.STATIC.quest[newQuest.quest_type],
        title: embedTitle,
        author: {
            name: `${author.tag} (Lvl. ${user.level})`,
            icon_url: author.displayAvatarURL()
        },
        description: `You may reset your quest when it is ${cooldownReduction ? 48 : 72} hours old.`,
        fields: [
            {name: 'Progress', value: progressString, inline: true},
            {name: 'Reward', value: `${newQuest.quest_reward} :lollipop:`, inline: true},
            {name: 'Quest Age', value: '1 minute', inline: true}
        ]
    };

    return [embed2, embed3];
}