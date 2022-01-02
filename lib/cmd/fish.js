// Handle "fish" Command
// # ----------------- #

const { MessageAttachment, MessageActionRow, MessageButton } = require('discord.js');

const api = require('../../api');
const db = require('../../db');
const logic = require('../logic')

const { getCooldownTime, calculateFisherScore, calculateFishWeight, getMaxWeight } = require('../misc/calculations.js');
const { createFishingCanvasPre, createFishingCanvasPost } = require('../misc/canvas.js');

const TIER_VALUES = { 'D': 0, 'C': 0.3, 'B': 0.6, 'A': 0.75, 'S': 0.9, 'SS': 1 };

module.exports.sendFishCommand = async function(interaction, user) {
    // FISH
    user.cooldown = parseInt(user.cooldown);
    // Step 1 - Validate Cooldown/Validate Bait
    const clan = await db.clan.fetchClanByUserid(user.userid);
    const currentEvent = await db.events.getCurrentEvent();
    const cooldownTime = getCooldownTime(user, clan, currentEvent);
    if (Date.now() - user.cooldown < cooldownTime) {
        return interaction.reply(`Please wait **${logic.text.millisToString(user.cooldown + cooldownTime - Date.now())}** to fish again!`);
    }
    const argument = interaction.options.getString('bait');
    let baitName, baitLabel, BaitData; // label for user to view
    if (argument) {
        baitName = argument.toLowerCase().replace(/ /g, '_');
        baitLabel = logic.text.capitalizeWords(baitName.replace(/_/g, ' '));
        BaitData = api.bait.getBaitData(baitName);
        if (!BaitData) { return interaction.reply(`**${argument}** is not a valid bait!`); }
        const baitCount = await db.bait.fetchBait(user.userid, baitName);
        if (baitCount <= 0) { return interaction.reply(`You don't have any **${baitLabel}**!`); }
    }

    // Step 2 - Update Database #1 (To Say User Fished)
    let cooldownDiscount = 0;
    if (user.big_supporter) { cooldownDiscount = Math.min(user.cooldown + cooldownTime - Date.now(), cooldownTime); }
    await db.users.setColumns(user.userid, { cooldown: Date.now() - cooldownDiscount });
    if (baitName) { await db.bait.updateColumn(user.userid, baitName, -1); }

    // Step 3 - Fetch Variables/Generate Fish
    const weatherId = (await db.weather.getCurrentEntry())[`l${user.location}`];

    const GloveData = api.equipment.getGloveData(user.gloves);
    const WeatherData = api.weather.getWeatherEffect(weatherId);
    const WeatherEmoji = [':sunny:', ':partly_sunny:', ':cloud:', ':cloud_rain:', ':thunder_cloud_rain:'][weatherId];
    const LocationData = api.fish.getLocationData(user.location);

    const gloveBonus = GloveData && GloveData.chance > Math.random() * 100 ? GloveData.bonus : 0;

    const generatedFish = await logic.generation.generateFish(user.location, BaitData, WeatherData);

    // Step 4 - Render Canvas
    const canvas = await createFishingCanvasPre(user, user.location, baitName, weatherId, generatedFish);
    const attachment = new MessageAttachment(canvas.toBuffer(), `cast_${interaction.id}.png`);

    // Step 5 - Send Embed
    let embed = {
        color: logic.color.STATIC.location[user.location - 1],
        title: `Location ${user.location} - ${LocationData.name} ${WeatherEmoji}`,
        author: {
            name: `${interaction.user.username}#${interaction.user.discriminator} (Lvl. ${user.level})`,
            icon_url: interaction.user.displayAvatarURL()
        },
        description: `${baitName ? `Used Bait: **${baitLabel}**\n` : ''}\
${gloveBonus ? `:gloves: Gloves Activated! (+${GloveData.bonus}kg Max)` : ''}`,
        image: {
            url: `attachment://cast_${interaction.id}.png`
        }
    };

    row = new MessageActionRow().addComponents(
        new MessageButton().setCustomId(`${interaction.id} catch`).setLabel('Catch').setStyle('PRIMARY')
    );
    
    return interaction.reply({ embeds: [embed], files: [attachment], components: [row] }).then(async () => {
        let [embed2, attachment2] = await createPostFishingEmbed(user, interaction.user, clan, generatedFish[0], canvas, gloveBonus, currentEvent, baitLabel);

        const filter = i => i.customId.split(' ')[0] === interaction.id;

        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 10000 });

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) { return i.reply({ content: 'That button is not for you!', ephemeral: true }); }
            collector.stop();
            interaction.editReply({ embeds: [embed2], files: [attachment2], components: [] });
        });

        collector.on('end', (collected, reason) => {
            if (reason === 'time') {
                interaction.editReply({ embeds: [embed2], files: [attachment2], components: [] });
            }
        });
    });
}
async function createPostFishingEmbed(user, author, clan, fish, oldCanvas, gloveBonus, currentEvent, baitLabel) {
    // Create Variables
    // calculate max weight
    let maxWeight = getMaxWeight(user, clan, currentEvent);
    if (gloveBonus) { maxWeight += gloveBonus; }
    if (fish.family === 'shark') {
        const SwivelData = api.equipment.getSwivelData(user.swivel);
        if (SwivelData) { maxWeight += SwivelData.bonus; console.log('Swivel Activated!'); }
    }
    // update fish variable, linesnap
    const FishData = api.fish.getFishData(fish.id);
    fish.weight = calculateFishWeight(fish.r, FishData);
    fish.tier = logic.text.rToTier(fish.r);
    const lineSnapped = fish.weight > maxWeight;
    // calculate coins, exp
    const HookData = api.equipment.getHookData(user.hook);
    const coins = lineSnapped ? 0 : Math.ceil(fish.weight * FishData.value * HookData.multiplier);
    const bonusCoins = Math.ceil(coins * logic.clan.getCoinBonus(clan)/100);
    const LineData = api.equipment.getLineData(user.line);
    const exp = lineSnapped ? 0 : Math.ceil(Math.sqrt(coins * 10)) + LineData.bonus;
    const bonusExp = Math.ceil(exp * logic.clan.getExpBonus(clan)/100);
    // handle level-ups
    let newExp = user.exp + exp + bonusExp, newLevel = user.level;
    let expRequired = api.leveldata.getPlayerLevelData(user.level + 1).expRequired;
    let levelUpString = '';
    while (newExp >= expRequired) {
        newLevel++;
        newExp -= expRequired;
        expRequired = api.leveldata.getPlayerLevelData(newLevel).expRequired;
        levelUpString += `\nLeveled up to Lvl. ${newLevel} :arrow_up:`;
        if (newLevel % 10 === 0) { levelUpString += '\nUnlocked a new location! :map:' }
    }
    // handle quest
    let questString = '', newQuestProgress = user.quest_progress;
    if (user.quest_type !== -1 && user.quest_progress !== user.quest_requirement) {
        if (user.quest_type === 0 && fish.r >= [0.3, 0.6, 0.75, 0.9][user.quest_data]) { // catch tier
            newQuestProgress = user.quest_progress + 1;
            questString = `\nCounts towards quest! (now ${newQuestProgress}/${user.quest_requirement}) :clock1:`;
        } else if (user.quest_type === 1) {
            newQuestProgress = Math.min(user.quest_progress + fish.weight, user.quest_requirement);
            questString = `\nCounts towards quest! (now ${newQuestProgress}/${user.quest_requirement}kg) :clock1:`;
        } else if (user.quest_type === 2 && user.quest_data === fish.id) {
            newQuestProgress = user.quest_progress + 1;
            questString = `\nCounts towards quest! (now ${newQuestProgress}/${user.quest_requirement}) :clock1:`;
        } else if (user.quest_type === 4 && BaitData && user.quest_data === BaitData.id) {
            newQuestProgress = user.quest_progress + 1;
            questString = `\nCounts towards quest! (now ${newQuestProgress}/${user.quest_requirement}) :clock1:`;
        }
        if (newQuestProgress === user.quest_requirement) {
            questString += '\n**Quest complete!** Use `/quest` to claim your rewards.';
        }
    }
    // handle cards
    let card;
    let cardString = '';
    if (user.ring) {
        const ring = await db.rings.getRing(user.ring);
        const RingData = api.equipment.getRingData(ring.ring_type);
        const cardDropChance = RingData.classBoost[FishData.sizeClass-1] + ring[['s', 'm', 'l', 'xl'][FishData.sizeClass-1]];
        if (Math.random()*100 < cardDropChance) {
            const cards = await db.cards.getAllUserCards(user.userid);
            if (cards.length >= 10) {
                cardString = '\nThe fish dropped a card but your card box was full! :x:'
            } else {
                const grade = logic.generation.generateCardGrade(ring, RingData);
                card = { userid: user.userid, fish: fish.id, r: fish.r, grade: grade };
                cardString = `\nYou got a fish card! View it with \`/card ${cards.length + 1}\` :card_index:`
            }
        }
    }
    // handle clan
    let clanString, isCampaignCatch;
    if (clan) {
        clanString = '\n+1 clan catch! :fish:';
        const clanMember = await db.clan.fetchMember(user.userid);
        if (Math.floor(Date.now() / 86400000) !== clanMember.last_campaign_catch && Date.now() - parseInt(clanMember.joined) > 86400000) {
            const CampaignData = api.campaign.getCampaignData(clan.campaign_stage);
            if (CampaignData && CampaignData.requirements.map(entry => entry[0]).includes(FishData.name)) {
                const campaignFishRequired = CampaignData.requirements.filter((entry) => entry[0] === FishData.name)[0][1];
                const campaignFishCaught = clan.campaign_progress.reduce((a, b) => b === fish.id ? a+1 : a, 0);
                if (campaignFishCaught < campaignFishRequired) {
                    clanString += '\n+1 campaign catch! :golf:';
                    isCampaignCatch = true;
                }
            }
        }
    }
    // handle bounty
    let bountyString = '', bountyComplete = false, bounty = null;
    if (user.level >= 10) {
        bounty = await db.bounty.getCurrentEntry();
        if (user.bounty !== bounty.id && FishData.name === bounty.fish && fish.r >= TIER_VALUES[bounty.tier]) {
            bountyComplete = true;
            bountyString = `\n\n**Bounty Complete!**\nYou got ${bounty.reward} :lollipop:`;
        }
    }

    const previousBest = (await db.aquarium.getFish(user.userid, [FishData.name]))[FishData.name];

    // Update Database
    if (!lineSnapped) {
        // Update coins, weight, fish caught, lollipops (from bounty)
        db.users.updateColumns(user.userid, {
            coins: coins + bonusCoins,
            weight_caught: Math.round(fish.weight * 1000),
            fish_caught: 1,
            lollipops: bountyComplete ? bounty.reward : 0
        });
        // Set exp, level, quest progress, last bounty id
        let instructions = {
            exp: newExp,
            level: newLevel,
            quest_progress: newQuestProgress
        };
        if (bountyComplete) {
            db.bounty.incrementCompleted();
            instructions.bounty = bounty.id;
        }
        db.users.setColumns(user.userid, instructions);
        // Update aquarium, fisher scores
        if (fish.r > previousBest) {
            db.aquarium.setColumn(user.userid, FishData.name, fish.r);
            // Fisher Score
            const AllFishData = api.fish.getFishDataFromLocation(user.location);
            db.aquarium.getFish(user.userid, AllFishData.map(obj => obj.name)).then(allFish => {
                const locationScore = calculateFisherScore(allFish, AllFishData);
                db.scores.setLocationScore(user.userid, user.location, locationScore).then(() => {
                    db.scores.updateOverallScore(user.userid);
                });
            });
        }
        // Insert cards
        if (card) {
            db.cards.addCard(card);
        }
        // Update clan stuff
        if (clan) {
            db.clan.updateClanColumns(clan.id, { fish_caught: 1 });
            if (isCampaignCatch) {
                db.clan.setMemberColumn(user.userid, 'last_campaign_catch', Math.floor(Date.now() / 86400000));
                db.clan.appendToClanCampaignProgress(clan.id, fish.id);
            }
        }
    }

    // Render Canvas
    const canvasBuffer = await createFishingCanvasPost(oldCanvas, fish, lineSnapped);
    const attachment2 = new MessageAttachment(canvasBuffer, `catch_${FishData.name}.png`);
    // Return Embed & Canvas
    return [{
        color: logic.color.STATIC.location[user.location - 1],
        title: `Caught a ${['a', 'e', 'i', 'o', 'u'].includes(FishData.name[0]) ? 'n' : ''} ${logic.text.capitalizeWords(FishData.name.replace(/_/g, ' '))}`,
        author: {
            name: `${author.username}#${author.discriminator} (Lvl. ${user.level})`,
            icon_url: author.displayAvatarURL()
        },
        description: `${baitLabel ? `Used Bait: **${baitLabel}**\n` : ''}\
${gloveBonus ? `:gloves: Gloves Activated! (+${gloveBonus}kg Max)\n` : ''}\
Gained ${coins}${bonusCoins ? ` (+${bonusCoins})` : ''} coin${coins === 1 ? '' : 's'}! :coin:
Gained ${exp}${bonusExp ? ` (+${bonusExp})` : ''} exp! :star:${levelUpString}\
${!lineSnapped && fish.r > previousBest ? `\nPersonal best ${FishData.name.replace(/_/g, ' ')} catch! Sent to aquarium :truck:` : ''}\
${cardString}${questString}${clanString}${bountyString}`,
        image: {
            url: `attachment://catch_${FishData.name}.png`
        }
    }, attachment2];
}