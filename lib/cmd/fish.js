// Handle "fish" Command
// # ----------------- #

const { MessageAttachment, MessageActionRow, MessageButton, MessageSelectMenu } = require('discord.js');

const api = require('../../api');
const db = require('../../db');
const logic = require('../logic')

const { getTutorialTwoEmbed, getTutorialSixEmbed } = require('./tutorial.js');

const { getCooldownTime, calculateFisherScore, calculateFishWeight, getMaxWeight } = require('../misc/calculations.js');
const { createFishingCanvasPre, createFishingCanvasPost, createTimeoutCanvas } = require('../misc/canvas.js');
const { handleMessageReplyError } = require('../misc/error.js');
const { sendReply } = require('../misc/reply.js');
const { pushStatsToWebsite } = require('../misc/websocket.js');

const TIER_VALUES = { 'D': 0, 'C': 0.3, 'B': 0.6, 'A': 0.75, 'S': 0.9, 'SS': 1 };

module.exports.sendFishCommand = async function(interaction, user, baitName) {
    // FISH
    user.cooldown = parseInt(user.cooldown);

    // Step 1 - Validate Cooldown/Validate Bait
    const clan = await db.clan.fetchClanByUserid(user.userid);
    const currentEvent = await db.events.getCurrentEvent();
    const cooldownTime = user.level < 10 ? 5000 : getCooldownTime(user, clan, currentEvent);
    if (Date.now() - user.cooldown < cooldownTime) {
        return sendReply(interaction, `Please wait **${logic.text.millisToString(user.cooldown + cooldownTime - Date.now())}** to fish again!`);
    }
    let baitLabel, BaitData; // label for user to view
    if (baitName) {
        baitName = baitName.toLowerCase().replace(/ /g, '_');
        baitLabel = logic.text.capitalizeWords(baitName.replace(/_/g, ' '));
        BaitData = api.bait.getBaitData(baitName);
        if (!BaitData) { return sendReply(interaction, `**${baitLabel}** is not a valid bait!`); }
        const baitCount = await db.bait.fetchBait(user.userid, baitName);
        if (baitCount <= 0) { return sendReply(interaction, `You don't have any **${baitLabel}**!`); }
    }

    // Step 2 - Update Database #1 (To Say User Fished)
    let cooldownDiscount = 0;
    if (user.big_supporter) { cooldownDiscount = Math.min(Date.now() - user.cooldown - cooldownTime, cooldownTime); }
    await db.users.setColumns(user.userid, { cooldown: Date.now() - cooldownDiscount });
    if (baitName) { await db.bait.updateColumn(user.userid, baitName, -1); }
    db.fishLog.recordFishEvent(user.userid);

    // Step 3 - Fetch Variables/Generate Fish
    const weatherId = (await db.weather.getCurrentEntry())[`l${user.location}`];

    const GloveData = api.equipment.getGloveData(user.gloves);
    const WeatherData = api.weather.getWeatherEffect(weatherId);
    const WeatherEmoji = [':sunny:', ':partly_sunny:', ':cloud:', ':cloud_rain:', ':thunder_cloud_rain:'][weatherId];
    const LocationData = api.fish.getLocationData(user.location);

    const gloveBonus = GloveData && GloveData.chance > Math.random() * 100 ? GloveData.bonus : 0;

    const BaseLocationFishNames = api.fish.getFishDataFromLocation(user.location).filter(obj => !obj.legendary).map(obj => obj.name);
    const BaseAquariumContents = await db.aquarium.getFish(user.userid, BaseLocationFishNames);
    const spawnLegendary = Math.min(...Object.values(BaseAquariumContents)) >= 0.75;
    const generatedFish = await logic.generation.generateFish(user.location, BaitData, WeatherData, spawnLegendary);

    // Step 4 - Render Canvas
    const canvas = await createFishingCanvasPre(user, user.location, baitName, weatherId, generatedFish);
    const attachment = new MessageAttachment(canvas.toBuffer(), `cast_${interaction.id}.png`);

    // Step 5 - Send Embed
    let embed = {
        color: logic.color.STATIC.location[user.location - 1],
        title: `Location ${user.location} - ${LocationData.name} ${WeatherEmoji}`,
        author: {
            name: `${interaction.user.tag} (Lvl. ${user.level})`,
            icon_url: interaction.user.displayAvatarURL()
        },
        description: `${baitName ? `Used Bait: **${baitLabel}**\n` : ''}\
${gloveBonus ? `:gloves: Gloves Activated! (+${GloveData.bonus}kg Max)` : ''}`,
        image: {
            url: `attachment://cast_${interaction.id}.png`
        }
    };
    if (currentEvent && currentEvent.type === 'cardfest') { embed.color = currentEvent.color; }

    row = new MessageActionRow().addComponents(
        new MessageButton().setCustomId(`${interaction.id} catch`).setLabel('Catch').setStyle('PRIMARY')
    );
    
    return sendReply(interaction, { embeds: [embed], files: [attachment], components: [row] }).then(async (sentMessage) => {
        let attachment2 = await createAttachment2(user, clan, generatedFish[0], gloveBonus, currentEvent, baitLabel, canvas);
        const filter = i => i.customId.split(' ')[0] === interaction.id;

        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 15000 });

        collector.on('collect', async i => {
            collector.stop();
            let embedArr = await createPostFishingEmbed(user, interaction.user, clan, generatedFish[0], gloveBonus, currentEvent, baitLabel, interaction.guild ? interaction.guild.id : false);
            if (user.tutorial === 1) {
                embedArr.push(await getTutorialTwoEmbed(interaction, user));
            }
            if (interaction.constructor.name === 'Message') {
                return sentMessage.edit({ embeds: embedArr, files: [attachment2], components: [] }).catch(err => handleMessageReplyError(err));
            }
            interaction.editReply({ embeds: embedArr, files: [attachment2], components: [] }).catch(err => handleMessageReplyError(err));
        });

        collector.on('end', async (collected, reason) => {
            if (reason === 'time') {
                /*canvasBuffer = await createTimeoutCanvas(canvas);
                attachment2 = new MessageAttachment(canvasBuffer, `timeout.png`);
                let embedArr = [{
                    color: logic.color.STATIC.location[user.location - 1],
                    title: `Timed Out`,
                    author: {
                        name: `${interaction.user.username}#${interaction.user.discriminator} (Lvl. ${user.level})`,
                        icon_url: interaction.user.displayAvatarURL()
                    },
                    description: `The fish got away! Be sure to press **catch** next time!
${baitLabel ? `\nUsed Bait: **${baitLabel}**` : ''}\
${gloveBonus ? `\n:gloves: Gloves Activated! (+${gloveBonus}kg Max)` : ''}`,
                    image: {
                        url: `attachment://timeout.png`
                    }
                }];*/
                let embedArr = await createPostFishingEmbed(user, interaction.user, clan, generatedFish[0], gloveBonus, currentEvent, baitLabel, interaction.guild ? interaction.guild.id : false);
                if (user.tutorial === 1) {
                    embedArr.push(await getTutorialTwoEmbed(interaction, user));
                }
                if (interaction.constructor.name === 'Message') {
                    return sentMessage.edit({ embeds: embedArr, files: [attachment2], components: [] }).catch(err => handleMessageReplyError(err));
                }
                interaction.editReply({ embeds: embedArr, files: [attachment2], components: [] }).catch(err => handleMessageReplyError(err));
            }
        });
    })
}
async function createAttachment2(user, clan, fish, gloveBonus, currentEvent, baitLabel, oldCanvas) {
    // Initial Variables
    const FishData = api.fish.getFishData(fish.id);
    fish.weight = calculateFishWeight(fish.r, FishData);
    fish.tier = logic.text.rToTier(fish.r);
    let maxWeight = await getMaxWeight(user, clan, currentEvent);
    if (gloveBonus) { maxWeight += gloveBonus; }
    if (FishData.family === 'shark') {
        const SwivelData = api.equipment.getSwivelData(user.swivel);
        if (SwivelData) { maxWeight += SwivelData.bonus; }
    }
    let BaitData;
    if (baitLabel) {
        BaitData = api.bait.getBaitData(baitLabel.replace(/ /g, '_').toLowerCase());
        if (BaitData.bonus) { maxWeight *= (1 + BaitData.bonus/100); }
    }
    const lineSnapped = fish.weight > maxWeight;

    // Render Canvas
    const canvasBuffer = await createFishingCanvasPost(oldCanvas, fish, lineSnapped);
    const attachment2 = new MessageAttachment(canvasBuffer, `catch_${FishData.name}.png`);

    return attachment2;
}
async function createPostFishingEmbed(user, author, clan, fish, gloveBonus, currentEvent, baitLabel, serverId) {
    // Create Variables
    // calculate max weight
    const FishData = api.fish.getFishData(fish.id);
    let maxWeight = await getMaxWeight(user, clan, currentEvent);
    if (gloveBonus) { maxWeight += gloveBonus; }
    if (FishData.family === 'shark') {
        const SwivelData = api.equipment.getSwivelData(user.swivel);
        if (SwivelData) { maxWeight += SwivelData.bonus; }
    }
    let BaitData;
    if (baitLabel) {
        BaitData = api.bait.getBaitData(baitLabel.replace(/ /g, '_').toLowerCase());
        if (BaitData.bonus) { maxWeight *= (1 + BaitData.bonus/100); }
    }
    // update fish variable, linesnap
    fish.weight = calculateFishWeight(fish.r, FishData);
    fish.tier = logic.text.rToTier(fish.r);
    const lineSnapped = fish.weight > maxWeight;
    // post to website
    pushStatsToWebsite(fish.weight);
    // calculate coins, exp
    const HookData = api.equipment.getHookData(user.hook);
    const coins = lineSnapped ? 0 : Math.ceil(fish.weight * FishData.value * HookData.multiplier);
    const bonusCoins = Math.ceil(coins * logic.clan.getCoinBonus(clan)/100);
    const LineData = api.equipment.getLineData(user.line);
    const exp = lineSnapped ? 0 : Math.ceil(Math.sqrt(coins * 10)) + LineData.bonus;
    const bonusExp = Math.ceil(exp * logic.clan.getExpBonus(clan)/100);
    // handle level-ups
    user = await db.users.fetchUser(user.userid); // fixes lag-bug for double fishing
    let newExp = user.exp + exp + bonusExp;
    let newLevel = user.level;
    let expRequired = api.leveldata.getPlayerLevelData(user.level + 1).expRequired;
    let levelUpString = '';
    while (newExp >= expRequired) {
        newLevel++;
        newExp -= expRequired;
        expRequired = api.leveldata.getPlayerLevelData(newLevel + 1).expRequired;
        levelUpString += `\nLeveled up to Lvl. ${newLevel} :arrow_up:`;
        if (newLevel % 10 === 0) { levelUpString += '\nUnlocked a new location! :map:' }
    }
    // handle quest
    let questString = ''
    let newQuestProgress = user.quest_progress;
    if (!lineSnapped && user.quest_type !== -1 && user.quest_progress !== user.quest_requirement) {
        if (user.quest_type === 0 && fish.r >= [0.3, 0.6, 0.75, 0.9][user.quest_data]) { // catch tier
            newQuestProgress = user.quest_progress + 1;
            questString = `\nCounts towards quest! (now ${newQuestProgress}/${user.quest_requirement}) :clock1:`;
        } else if (user.quest_type === 1) {
            newQuestProgress = Math.min(Math.round(user.quest_progress + fish.weight*1000), user.quest_requirement);
            questString = `\nCounts towards quest! (now ${newQuestProgress/1000}/${Math.round(user.quest_requirement/1000)}kg) :clock1:`;
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
    if (!lineSnapped && user.ring) {
        const ring = await db.rings.getRing(user.ring);
        const RingData = api.equipment.getRingData(ring.ring_type);
        let cardDropChance = RingData.classBoost[FishData.sizeClass-1] + ring[['s', 'm', 'l', 'xl'][FishData.sizeClass-1]];
        if (currentEvent && currentEvent.type === 'cardfest') { cardDropChance = parseInt(currentEvent.params); }
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
    let clanString = '', isCampaignCatch;
    if (!lineSnapped && clan && user.level >= 10) {
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
    if (!lineSnapped && user.level >= 10) {
        bounty = await db.bounty.getCurrentEntry();
        if (user.bounty !== bounty.id && FishData.name === bounty.fish && fish.r >= TIER_VALUES[bounty.tier]) {
            bountyComplete = true;
            bountyString = `\n\n**Bounty Complete!**\nYou got ${bounty.reward} :lollipop:`;
        }
    }

    let previousBest;

    // Update Database
    if (!lineSnapped) {
        previousBest = (await db.aquarium.getFish(user.userid, [FishData.name]))[FishData.name];
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
        // Update server (if server)
        if (serverId) {
            db.servers.updateColumns(serverId, { fish_caught: 1, weight_caught: Math.round(fish.weight * 1000) });
        }
        // Update aquarium, fisher scores
        if (fish.r > previousBest) {
            db.aquarium.setColumn(user.userid, FishData.name, fish.r);
            // Fisher Score
            const AllFishData = api.fish.getFishDataFromLocation(user.location);
            db.aquarium.getFish(user.userid, AllFishData.map(obj => obj.name)).then(allFish => {
                allFish[FishData.name] = fish.r;
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
        if (clan && user.level >= 10) {
            db.clan.updateClanColumns(clan.id, { fish_caught: 1 });
            db.clan.setClanColumn(clan.id, 'last_fished', Date.now());
            if (isCampaignCatch) {
                db.clan.setMemberColumn(user.userid, 'last_campaign_catch', Math.floor(Date.now() / 86400000));
                db.clan.updateMemberColumn(user.userid, 'campaign_catches', 1);
                db.clan.appendToClanCampaignProgress(clan.id, fish.id);
            }
        }
    }

    // Return Embed & Canvas
    let embedFields = lineSnapped ? [] : [{
            name: 'Weight :scales:',
            value: logic.text.kgToWeight(fish.weight),
            inline: true
        }];

    if (!lineSnapped) {
        if (user.show_r_value) {
            embedFields.push({
                name: 'R :mag_right:',
                value: fish.r.toFixed(4),
                inline: true
            });
        }
        if (user.show_seed) {
            embedFields.push({
                name: 'Seed :seedling:',
                value: fish.seed.toFixed(4),
                inline: true
            });
        }
        if (embedFields.length == 2) {
            embedFields.push({
                name: '\u200b',
                value: '\u200b',
                inline: true
            });
        }
    }

    let embedArr = [{
        color: logic.color.STATIC.location[user.location - 1],
        title: `${lineSnapped ? 'Oh no! Your line snapped on' : 'Caught'} a${!lineSnapped && ['a', 'e', 'i', 'o', 'u'].includes(FishData.name[0]) ? 'n' : ''} ${lineSnapped ? `${logic.text.kgToWeight(fish.weight)} ` : ''}${FishData.name.replace(/_/g, ' ')}!`,
        author: {
            name: `${author.username}#${author.discriminator} (Lvl. ${user.level})`,
            icon_url: author.displayAvatarURL()
        },
        description: `${lineSnapped ? 'The fish got away!\n' : ''}${baitLabel ? `Used Bait: **${baitLabel}**\n` : ''}\
${gloveBonus ? `:gloves: Gloves Activated! (+${gloveBonus}kg Max)\n` : ''}\
Gained ${coins}${bonusCoins ? ` (+${bonusCoins})` : ''} coin${coins === 1 ? '' : 's'}! :coin:
Gained ${exp}${bonusExp ? ` (+${bonusExp})` : ''} exp! :star:${levelUpString}\
${!lineSnapped && fish.r > previousBest ? `\nPersonal best ${FishData.name.replace(/_/g, ' ')} catch! Sent to aquarium :truck:` : ''}\
${cardString}${questString}${clanString}${bountyString}`,
        fields: embedFields,
        image: {
            url: `attachment://catch_${FishData.name}.png`
        },
        footer: {
            text: lineSnapped ? 'Use /equipment to view your equipment.' : ''
        }
    }];

    if (newLevel === 10 && user.level === 9) {
        embedArr.push(await getTutorialSixEmbed({ user: author }, user));
        db.users.updateColumn(user.userid, 'lollipops', 50);
    }

    return embedArr;
}