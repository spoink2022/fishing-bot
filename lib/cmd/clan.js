// Handle All "clan" Commands
// # ---------------------- #

const { MessageAttachment, MessageActionRow, MessageButton } = require('discord.js');

const api = require('../../api');
const db = require('../../db');
const logic = require('../logic');

const { calculateFishWeight, getMaxWeight, calculateFisherScore } = require('../misc/calculations.js');
const { createClanBoatCanvas, createInfoCanvas } = require('../misc/canvas.js');
const { sendReply } = require('../misc/reply.js');

const TIER_VALUES = { 'D': 0, 'C': 0.3, 'B': 0.6, 'A': 0.75, 'S': 0.9, 'SS': 1 };

module.exports.sendClanCommandInteraction = async function(interaction, user) {
    // Keep usernames in database updated (silent)
    const clanMember = await db.clan.fetchMember(user.userid);
    if (clanMember && clanMember.tag !== interaction.user.tag) {
        clanMember.tag = interaction.user.tag;
        db.clan.setMemberTag(user.userid, clanMember.tag);
    }

    let mentionedUser, clanName, clanId, password, memberId, category;
    if (interaction.options.getSubcommandGroup(false) === 'buy') {
        category = interaction.options.getSubcommand();
        return sendBuy(interaction, user, clanMember, category);
    }
    switch (interaction.options.getSubcommand()) {
        case 'profile':
            mentionedUser = interaction.options.getUser('user') || interaction.user;
            sendProfile(interaction, user, clanMember, mentionedUser);
            break;
        case 'members':
            sendMembers(interaction, user, clanMember);
            break;
        case 'board':
            sendBoard(interaction, user, clanMember);
            break;
        case 'create':
            clanName = interaction.options.getString('name');
            sendCreate(interaction, user, clanMember, clanName);
            break;
        case 'join':
            clanId = interaction.options.getInteger('id');
            password = interaction.options.getString('password');
            sendJoin(interaction, user, clanMember, clanId, password);
            break;
        case 'leave':
            sendLeave(interaction, user, clanMember);
            break;
        case 'rename':
            clanName = interaction.options.getString('name');
            sendRename(interaction, user, clanMember, clanName);
            break;
        case 'promote':
            memberId = interaction.options.getInteger('member');
            sendPromote(interaction, user, clanMember, memberId);
            break;
        case 'demote':
            memberId = interaction.options.getInteger('member');
            sendDemote(interaction, user, clanMember, memberId);
            break;
        case 'kick':
            memberId = interaction.options.getInteger('member');
            sendKick(interaction, user, clanMember, memberId);
            break;
        case 'check':
            sendPasswordCheck(interaction, clanMember);
            break;
        case 'generate':
            sendPasswordGenerate(interaction, clanMember);
            break;
        case 'disable':
            sendPasswordDisable(interaction, clanMember);
            break;
        case 'campaign':
            sendCampaign(interaction, user, clanMember);
            break;
        case 'perks':
            sendPerks(interaction, user, clanMember);
            break;
        case 'shop':
            sendShop(interaction, user, clanMember);
            break;
        case 'boat':
            sendBoat(interaction, user, clanMember);
            break;
        default:
            break;
    }
}

module.exports.sendClanCommandMessage = async function(msg, user, mentionedUser) {
    const cmd = msg.content.split(' ')[1];
    let args = msg.content.split(' ').slice(2);
    // Keep usernames in database updated (silent)
    const clanMember = await db.clan.fetchMember(user.userid);
    if (clanMember && clanMember.tag !== msg.author.tag) {
        clanMember.tag = msg.author.tag;
        db.clan.setMemberTag(user.userid, clanMember.tag);
    }

    let clanName, clanId, password, memberId, category;
    switch (cmd) {
        case 'profile':
            sendProfile(msg, user, clanMember, mentionedUser || msg.author);
            break;
        case 'members':
            sendMembers(msg, user, clanMember);
            break;
        case 'board':
            sendBoard(msg, user, clanMember);
            break;
        case 'create':
            clanName = args.join(' ');
            sendCreate(msg, user, clanMember, clanName);
            break;
        case 'join':
            clanId = args[0];
            password = args[1];
            sendJoin(msg, user, clanMember, clanId, password);
            break;
        case 'leave':
            sendLeave(msg, user, clanMember);
            break;
        case 'rename':
            clanName = args.join(' ');
            sendRename(msg, user, clanMember, clanName);
            break;
        case 'promote':
            memberId = args[0];
            sendPromote(msg, user, clanMember, memberId);
            break;
        case 'demote':
            memberId = args[0];
            sendDemote(msg, user, clanMember, memberId);
            break;
        case 'kick':
            memberId = args[0];
            sendKick(msg, user, clanMember, memberId);
            break;
        case 'password':
            if (args[0] === 'check') { sendPasswordCheck(msg, clanMember); }
            else if (args[0] === 'generate') { sendPasswordGenerate(msg, clanMember); }
            else if (args[0] === 'disable') { sendPasswordDisable(msg, clanMember); }
            break;
        case 'campaign':
            sendCampaign(msg, user, clanMember);
            break;
        case 'perks':
            sendPerks(msg, user, clanMember);
            break;
        case 'shop':
            sendShop(msg, user, clanMember);
            break;
        case 'buy':
            category = args[0];
            sendBuy(msg, user, clanMember, category);
            break;
        case 'boat':
            sendBoat(msg, user, clanMember);
            break;
        default:
            break;
    }
}


// Helper Functions
function isValidName(name) {
    const VALID_CHARACTERS = [...'!?#$%&():;1234567890qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM '];
    const validCharactersOnly = ![...name].some(char => !VALID_CHARACTERS.includes(char));
    return name.length <= 32 && !name.includes('  ') && validCharactersOnly;
}

function generateActivityMarker(member) {
    if (Date.now() - parseInt(member.joined) < 86400000) { return ':white_large_square:'; }
    if (Math.floor(Date.now() / 86400000) === member.last_campaign_catch) { return ':blue_square:'; }
    const daysSinceLastFished = (Date.now() - parseInt(member.cooldown))/86400000;
    if (daysSinceLastFished < 7) { return ':green_square:'; }
    if (daysSinceLastFished < 14) { return ':yellow_square:'; }
    return ':red_square:';
}

function generateClanPassword() {
    const CHAR_LIST = [...'abcdefghijkmnpqrstuvwxyzABCDEFGHIJKLMNPQRSTUVWXYZ123456789'];
    const CHAR_COUNT = 4;
    return [...Array(CHAR_COUNT)].map(() => CHAR_LIST[Math.floor(Math.random() * CHAR_LIST.length)]).join('');
}

// "Exports"
async function sendProfile(interaction, user, clanMember, mentionedUser) {
    if (!clanMember) { return sendReply(interaction, 'You are not currently in a clan! For more information, use `/help clan`.'); }
    // CLAN: PROFILE
    // Step 1 - Validate User Argument
    let USER_MENTIONED = false;

    if (mentionedUser.id !== interaction.user.id) {
        if (mentionedUser.bot) {
            return sendReply(interaction, `**${mentionedUser.username}** is a bot and cannot have a Big Tuna account!`);
        }
        user = await db.users.fetchUser(mentionedUser.id);
        if (!user) {
            return sendReply(interaction, `**${mentionedUser.username}** has not used Big Tuna before!`);
        } else if (!user.opted_in) {
            return sendReply(interaction, `**${mentionedUser.username}** is not opted in! They must use the \`/optin\` command to make their clan status publicy visible.`);
        }
        USER_MENTIONED = true;
    }

    // Step 2 - Fetch Data
    const clan = await db.clan.fetchClanByUserid(user.userid);
    if (!clan) { // validation for mentioned user
        let embed = {
            color: logic.color.STATIC.clan,
            title: 'No Clan'
        };
        return sendReply(interaction, { embeds: [embed] });
    }
    const members = await db.clan.fetchMembers(clan.id);

    // Step 2A - Fetch Clan Avatar
    const leader = members.filter(obj => obj.role === 2)[0];
    const clanAvatarID = await db.cosmetics.getEquippedCosmetic(leader.userid, 1);
    const clanAvatarUrl = clanAvatarID === null ? null : `${api.images.CLOUD_PATH}/cosmetics/clan_avatar/${api.cosmetics.getCosmeticSrc('clan_avatar', clanAvatarID)}.png`;

    // Step 3 - Send Embed
    const memberString = members.map(member => {
        let asterisks = member.userid === mentionedUser.id ? '**' : '';
        const roleEmoji = ['', ':reminder_ribbon: ', ':crown: '][member.role];
        if (USER_MENTIONED && clan.id !== clanMember.clan && !member.opted_in) { member.tag = 'opted out'; asterisks = '*'; }
        else { member.tag = member.tag.replace(/\*/g, '\\*').replace(/_/g, '\\_').replace(/~/g, '\\~').replace(/`/g, '\\`'); }
        return `${generateActivityMarker(member)} ${roleEmoji}${asterisks}${member.tag} (Lvl.${member.level})${asterisks}`;
    }).join('\n');

    const stars = logic.clan.getStarCount(clan.fish_caught);
    let embed = {
        color: logic.color.STATIC.clan,
        title: `Clan Overview${USER_MENTIONED ? ` - ${mentionedUser.username}` : ''}`,
        author: {
            name: clan.name,
            icon_url: clanAvatarUrl
        },
        description: `:globe_with_meridians: Global Clan ID: ${clan.id}
${clan.password ? ':lock: Password-protected (hidden from \`/clan board\`)' : ':unlock: No Password (visible on \`/clan board\`)'}
:placard: Renames Left: ${clan.rename}
:shield: Clan Points: ${clan.clan_points}
\n${':star:'.repeat(stars)} ${stars} Star${stars !== 1 ? 's' : ''}
:fish: Fish Caught: ${clan.fish_caught}
:golf: Campaign Stage: ${clan.campaign_stage}
\n**__Members__ (${members.length}/20)**
${memberString}`,
        footer: { 
            text: `Campaign cooldown resets in ${logic.text.millisToString(Math.ceil(Date.now()/86400000)*86400000 - Date.now())}`
        }
    }
    sendReply(interaction, { embeds: [embed] });
}

async function sendMembers(interaction, user, clanMember) {
    if (!clanMember) { return sendReply(interaction, 'You are not currently in a clan! For more information, use `/help clan`.'); }
    // CLAN: MEMBERS
    // Step 1 - Fetch Data
    const clan = await db.clan.fetchClanByUserid(user.userid);
    const members = await db.clan.fetchMembers(clan.id);

    // Step 1A - Fetch Clan Avatar
    const leader = members.filter(obj => obj.role === 2)[0];
    const clanAvatarID = await db.cosmetics.getEquippedCosmetic(leader.userid, 1);
    const clanAvatarUrl = clanAvatarID === null ? null : `${api.images.CLOUD_PATH}/cosmetics/clan_avatar/${api.cosmetics.getCosmeticSrc('clan_avatar', clanAvatarID)}.png`;

    // Step 2 - Send Embed
    let increment = 0;
    const memberString = members.map(member => {
        increment++;
        let asterisks = member.userid === interaction.user.id ? '**' : '';
        const roleEmoji = ['', ':reminder_ribbon: ', ':crown: '][member.role];
        member.tag = member.tag.replace(/\*/g, '\\*').replace(/_/g, '\\_').replace(/~/g, '\\~').replace(/`/g, '\\`');
        return `\`${increment}\` ${generateActivityMarker(member)} ${roleEmoji}${asterisks}${member.tag} (Lvl.${member.level}) | ${member.campaign_catches}/${member.boat_contribution}${asterisks}`;
    }).join('\n');

    let embed = {
        color: logic.color.STATIC.clan,
        title: `Member Overview`,
        author: {
            name: clan.name,
            icon_url: clanAvatarUrl
        },
        description: `Includes member ID (left) and campaign contribution/boat contribution (right).
\n**__Members__ (${members.length}/20)**
${memberString}`,
        footer: { 
            text: `Campaign cooldown resets in ${logic.text.millisToString(Math.ceil(Date.now()/86400000)*86400000 - Date.now())}`
        }
    }
    sendReply(interaction, { embeds: [embed] });
}

async function sendBoard(interaction, user, clanMember) {
    // CLAN: BOARD
    // Step 1 - Fetch random entries from clans
    const clans = await db.clan.fetchRandomJoinableClans();

    const memberCountsArr = await db.clan.fetchMemberCounts(clans.map(obj => obj.id));
    let memberCounts = {};
    memberCountsArr.forEach(obj => memberCounts[obj.clan] = parseInt(obj.count));

    const levelSumsArr = await db.clan.fetchMemberLevelSums(clans.map(obj => obj.id));
    let levelAverages = {};
    levelSumsArr.forEach(obj => levelAverages[obj.clan] = Math.round(parseInt(obj.sum) / memberCounts[obj.clan]));

    // Step 2 - Send Embed
    let embed = {
        color: logic.color.STATIC.clan,
        title: 'Joinable Clans',
        description: `Below are randomly selected clans that do not require a password to join.
Clans appearing in this list have at least 1 active player.\n\u200b`,
        fields: clans.map((clan, i) => {
            return {
                name: clan.name,
                value: `:busts_in_silhouette: Members: ${memberCounts[clan.id]}/20
:star: Avg Level: Lvl. ${levelAverages[clan.id]}
:golf: Campaign Stage: ${clan.campaign_stage}
\`/clan join ${clan.id}\`${i !== 2 ? '\n\u200b' : ''}`
            }
        })
    };
    sendReply(interaction, { embeds: [embed] });
}

async function sendCreate(interaction, user, clanMember, clanName) {
    if (clanMember) { return sendReply(interaction, 'You are already in a clan!'); }
    // CLAN: CREATE
    // Step 1 - User Requirements/Validate Name
    if (user.level < 20) {
        return sendReply(interaction, 'You must be at least **Lvl. 20** to create your own clan!');
    } else if (user.coins < 5000) {
        return sendReply(interaction, 'You must have at least **5000 coins** to create your own clan!');
    }
    if (!clanName) { return sendReply(interaction, 'You must provide a name for your clan!'); } // text-based command calls
    if (!isValidName(clanName)) {
        let embed = {
            color: logic.color.STATIC.failure,
            title: `"${clanName}" does not meet clan name requirements!`,
            description: `**Clan names may not...**
- exceed 32 characters
- include a double space
- include characters other than: \`!?#$%&():;1234567890qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM \``
        };
        return sendReply(interaction, { embeds: [embed] });
    }

    // Step 2 - Send Confirmation Embed
    let embed = {
        color: logic.color.STATIC.default,
        title: 'Create Clan for 5000 Coins?',
        description: `Your clan name will be **${clanName}**`
    };
    const row = new MessageActionRow().addComponents(
        new MessageButton().setCustomId(`${interaction.id} confirm`).setLabel('Confirm').setStyle('SUCCESS'),
        new MessageButton().setCustomId(`${interaction.id} cancel`).setLabel('Cancel').setStyle('DANGER')
    );
    sendReply(interaction, { embeds: [embed], components: [row] }).then(async (sentMessage) => {
        const filter = i => i.customId.split(' ')[0] === interaction.id;

        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 15000 });

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) { return i.reply({ content: 'That button is not for you!', ephemeral: true }); }
            collector.stop();

            const action = i.customId.split(' ')[1];
            let embed2;
            if (action === 'confirm') {
                embed2 = await handleCreateConfirmButton(user, `${interaction.user.username}#${interaction.user.discriminator}`, clanName);
            } else {
                embed2 = await handleCreateCancelButton();
            }
            await i.update({ embeds: [embed, embed2], components: [] });
        });

        collector.on('end', (collected, reason) => {
            if (reason === 'time') {
                if (interaction.constructor.name === 'Message') { return sentMessage.edit({ embeds: [embed], components: [] }); }
                interaction.editReply({ embeds: [embed], components: [] });
            }
        });
    });
}
async function handleCreateConfirmButton(user, tag, clanName) {
    // Re-Validate User
    const newUser = await db.users.fetchUser(user.userid);
    const newClanMember = await db.clan.fetchMember(user.userid);
    if (newClanMember) {
        return {
            color: logic.color.STATIC.failure,
            title: 'Action Cancelled',
            description: 'You are already in a clan!'
        };
    }
    if (newUser.coins < 5000) {
        return {
            color: logic.color.STATIC.failure,
            title: 'Action Cancelled',
            description: 'You no longer have the **5000 coins** required to create a clan!'
        };
    }
    // Update Database
    const clanId = await db.clan.createClan(clanName);
    await db.clan.createClanMember(user.userid, tag, clanId, 2);
    await db.users.updateColumns(user.userid, { coins: -5000 });
    // Return Embed
    return {
        color: logic.color.STATIC.success,
        title: 'Clan Created!',
        description: `You now have ${user.coins-5000} coins!\n\nCheck out your clan with \`/clan profile\`.`
    };
}
async function handleCreateCancelButton() {
    return {
        color: logic.color.STATIC.failure,
        title: 'Cancelled!',
        description: 'Clan was not created.'
    };
}

async function sendJoin(interaction, user, clanMember, clanId, password) {
    if (clanMember) { return sendReply(interaction, 'You are already in a clan!'); }
    // CLAN: JOIN
    // Step 1 - Validate Clan Exists, Password Correct, Clan Not Full
    if (!clanId) { return sendReply(interaction, 'You must provide a clan id!'); } // text-based command calls
    if (!+clanId) { return sendReply(interaction, 'A clan ID must be a **number**!'); } // text-based command calls
    const clan = await db.clan.fetchClan(clanId);
    if (!clan) { return sendReply(interaction, `There is no clan with id **${clanId}**!`); }
    if (clan.password && !password) { return sendReply(interaction, 'This clan requires a password to join!'); }
    if (clan.password && clan.password !== password) { return sendReply(interaction, 'Incorrect password!'); }
    const members = await db.clan.fetchMembers(clanId);
    if (members.length >= 20) { return sendReply(interaction, 'This clan is already full!'); }

    // Step 2 - Update Database
    await db.clan.createClanMember(user.userid, `${interaction.user.tag}`, clanId);
    if (members.length === 19) { await db.clan.setClanColumn(clanId, 'is_full', true); }

    // Step 3 - Send Embed
    let embed = {
        color: logic.color.STATIC.clan,
        title: `Joined Clan!`,
        description: `You joined the clan **${clan.name}**!
Check it out with \`/clan profile\`.`
    }
    sendReply(interaction, { embeds: [embed] });
}

async function sendLeave(interaction, user, clanMember) {
    if (!clanMember) { return sendReply(interaction, 'You are not in a clan!'); }
    // CLAN: LEAVE
    // Step 1 - Validate User Can Leave
    const members = await db.clan.fetchMembers(clanMember.clan);
    if (clanMember.role === 2 && members.length !== 1) { return sendReply(interaction, 'Promote a player to Clan Leader before leaving your clan!'); }    
    // Step 2 - Send Confirmation Embed
    const clan = await db.clan.fetchClan(clanMember.clan);
    let embed = {
        color: logic.color.STATIC.default,
        title: `Leave Clan ${clan.name}?`
    };
    if (clanMember.role === 2) { embed.description = 'Your clan will be permanently deleted if you leave.'; }

    const row = new MessageActionRow().addComponents(
        new MessageButton().setCustomId(`${interaction.id} confirm`).setLabel('Confirm').setStyle('SUCCESS'),
        new MessageButton().setCustomId(`${interaction.id} cancel`).setLabel('Cancel').setStyle('DANGER')
    );
    sendReply(interaction, { embeds: [embed], components: [row] }).then(async (sentMessage) => {
        const filter = i => i.customId.split(' ')[0] === interaction.id;

        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 15000 });

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) { return i.reply({ content: 'That button is not for you!', ephemeral: true }); }
            collector.stop();

            const action = i.customId.split(' ')[1];
            let embed2;
            if (action === 'confirm') {
                embed2 = await handleLeaveConfirmButton(user, clanMember, clan);
            } else {
                embed2 = await handleLeaveCancelButton(clan.name);
            }
            await i.update({ embeds: [embed, embed2], components: [] });
        });

        collector.on('end', (collected, reason) => {
            if (reason === 'time') {
                if (interaction.constructor.name === 'Message') { return sentMessage.edit({ embeds: [embed], components: [] }); }
                interaction.editReply({ embeds: [embed], components: [] });
            }
        });
    });
}
async function handleLeaveConfirmButton(user, clanMember, clan) {
    // Re-Validate User & Clan
    const newMembers = await db.clan.fetchMembers(clanMember.clan);
    const newClanMember = await db.clan.fetchMember(user.userid);
    if (clanMember.clan !== newClanMember.clan) {
        return {
            color: logic.color.STATIC.failure,
            title: 'Action Cancelled',
            description: 'You are no longer in this clan!'
        };
    }
    if (newClanMember.role === 2 && newMembers.length !== 1) {
        return {
            color: logic.color.STATIC.failure,
            title: 'Action Cancelled',
            description: 'You are the Clan Leader!\nYou must promote another player to Clan Leader before leaving.'
        }
    }
    // Update Database
    await db.clan.removeMember(user.userid);
    if (clan.is_full) { await db.clan.setClanColumn(clan.id, 'is_full', false); }
    // Return Embed
    return {
        color: logic.color.STATIC.success,
        title: 'Left Clan!',
        description: `You are no longer part of the clan **${clan.name}**`
    };
}
async function handleLeaveCancelButton(clanName) {
    return {
        color: logic.color.STATIC.failure,
        title: 'Action Cancelled!',
        description: `You are still in the clan **${clanName}**.`
    };
}

async function sendRename(interaction, user, clanMember, clanName) {
    // CLAN: RENAME
    // Step 1 - Validate Action Valid
    if (!clanMember) { return sendReply(interaction, 'You are not currently in a clan! For more information, use `/help clan`.'); }
    if (clanMember.role === 0) { return sendReply(interaction, 'You must be a **Trusted Member** or the **Clan Leader** to rename a clan!'); }
    const clan = await db.clan.fetchClanByUserid(user.userid);
    if (clan.rename <= 0) { return sendReply(interaction, 'Your clan does not have any renames left! Purchase more with `/clan shop`!'); }

    if (!clanName) { return sendReply(interaction, 'You must provide the new name of your clan!'); } // text-based command calls
    if (!isValidName(clanName)) {
        let embed = {
            color: logic.color.STATIC.failure,
            title: `"${clanName}" does not meet clan name requirements!`,
            description: `**Clan names may not...**
- exceed 32 characters
- include a double space
- include characters other than: \`!?#$%&():;1234567890qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM \``
        };
        return sendReply(interaction, { embeds: [embed] });
    }
    
    // Step 2 - Send Confirmation Embed
    let embed = {
        color: logic.color.STATIC.default,
        title: `Change clan name from ${clan.name} to ${clanName}?`,
        description: `After this action your clan will have ${clan.rename-1} rename${clan.rename-1 !== 1 ? 's' : ''} left.`
    };
    const row = new MessageActionRow().addComponents(
        new MessageButton().setCustomId(`${interaction.id} confirm`).setLabel('Confirm').setStyle('SUCCESS'),
        new MessageButton().setCustomId(`${interaction.id} cancel`).setLabel('Cancel').setStyle('DANGER')
    );
    sendReply(interaction, { embeds: [embed], components: [row] }).then(async (sentMessage) => {
        const filter = i => i.customId.split(' ')[0] === interaction.id;

        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 15000 });

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) { return i.reply({ content: 'That button is not for you!', ephemeral: true }); }
            collector.stop();

            const action = i.customId.split(' ')[1];
            let embed2;
            if (action === 'confirm') {
                embed2 = await handleRenameConfirmButton(user, clanMember, clanName);
            } else {
                embed2 = await handleRenameCancelButton();
            }
            await i.update({ embeds: [embed, embed2], components: [] });
        });

        collector.on('end', (collected, reason) => {
            if (reason === 'time') {
                if (interaction.constructor.name === 'Message') { return sentMessage.edit({ embeds: [embed], components: [] }); }
                interaction.editReply({ embeds: [embed], components: [] });
            }
        });
    });
}
async function handleRenameConfirmButton(user, clanMember, clanName) {
    // Re-Validate User & Clan (no need to validate member role since it doesn't really break anything)
    const newClanMember = await db.clan.fetchMember(user.userid);
    if (newClanMember.clan !== clanMember.clan) {
        return {
            color: logic.color.STATIC.failure,
            title: 'Action Cancelled',
            description: 'You are no longer in this clan!'
        };
    }
    const clan = await db.clan.fetchClan(clanMember.clan);
    if (!clan || clan.rename <= 0) {
        return {
            color: logic.color.STATIC.failure,
            title: 'Action Cancelled',
            description: 'Your clan does not have any renames left.'
        }
    }
    // Update Database
    await db.clan.setClanName(clanMember.clan, clanName, paid=true);
    // Return Embed
    return {
        color: logic.color.STATIC.success,
        title: 'Clan Renamed!',
        description: `The name of your clan is now **${clanName}**!`
    };
}
async function handleRenameCancelButton() {
    return {
        color: logic.color.STATIC.failure,
        title: 'Action Cancelled!',
        description: 'Clan was not renamed.'
    };
}

async function sendPromote(interaction, user, clanMember, memberId) {
    // CLAN: PROMOTE
    // Step 1 - Validate Action Valid
    if (!clanMember) { return sendReply(interaction, 'You are not currently in a clan! For more information, use `/help clan`.'); }
    if (clanMember.role === 0) { return sendReply(interaction, 'You must be a **Trusted Member** or the **Clan Leader** to promote clan members!'); }
    if (!memberId) { return sendReply(interaction, 'You must specify the id of the member to promote!'); } // text-based command calls
    if (!parseInt(memberId)) { return sendReply(interaction, 'A member ID must be a **number**!'); } // text-based command calls
    const members = await db.clan.fetchMembers(clanMember.clan);
    if (memberId <= 0 || memberId > members.length) {
        return sendReply(interaction, `**${memberId}** is not a valid member ID! See \`/clan members\` for a list of member IDs.`);
    }
    const member = await db.clan.fetchMemberByMemberId(clanMember.clan, memberId);
    if (member.userid === user.userid) { return sendReply(interaction, 'You cannot promote yourself!'); }
    if (clanMember.role <= member.role) {
        return sendReply(interaction, 'You cannot promote members with an equal or higher rank than you!!');
    }

    // Step 2 - Send Confirmation Embed
    const newRole = ['Trusted Member', 'Clan Leader'][member.role];
    let embed = {
        color: logic.color.STATIC.default,
        title: `Promote ${member.tag} to ${newRole}?`,
        description: member.role === 1 ? 'You will be demoted to **Trusted Member**.' : ''
    };
    const row = new MessageActionRow().addComponents(
        new MessageButton().setCustomId(`${interaction.id} confirm`).setLabel('Confirm').setStyle('SUCCESS'),
        new MessageButton().setCustomId(`${interaction.id} cancel`).setLabel('Cancel').setStyle('DANGER')
    );
    sendReply(interaction, { embeds: [embed], components: [row] }).then(async (sentMessage) => {
        const filter = i => i.customId.split(' ')[0] === interaction.id;

        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 15000 });

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) { return i.reply({ content: 'That button is not for you!', ephemeral: true }); }
            collector.stop();

            const action = i.customId.split(' ')[1];
            let embed2;
            if (action === 'confirm') {
                embed2 = await handlePromoteConfirmButton(clanMember, member);
            } else {
                embed2 = await handlePromoteCancelButton(member.tag);
            }
            await i.update({ embeds: [embed, embed2], components: [] });
        });

        collector.on('end', (collected, reason) => {
            if (reason === 'time') {
                if (interaction.constructor.name === 'Message') { return sentMessage.edit({ embeds: [embed], components: [] }); }
                interaction.editReply({ embeds: [embed], components: [] });
            }
        });
    });
}
async function handlePromoteConfirmButton(clanMember, member) { // clanMember is author
    // Re-Validate Can Promote
    const newMember = await db.clan.fetchMember(member.userid);
    const newClanMember = await db.clan.fetchMember(clanMember.userid);
    if (!newMember || newMember.clan !== clanMember.clan) { // target not in clan anymore
        return {
            color: logic.color.STATIC.failure,
            title: 'Action Cancelled',
            description: `**${member.tag}** is no longer in your clan!`
        };
    }
    if (!newClanMember || newClanMember.clan !== clanMember.clan) { // self not in clan anymore
        return {
            color: logic.color.STATIC.failure,
            title: 'Action Cancelled',
            description: 'You are no longer in this clan!'
        };
    }
    if (newClanMember.role <= newMember.role) { // self lacks rank
        return {
            color: logic.color.STATIC.failure,
            title: 'Action Cancelled',
            description: `You no longer have the rank to promote **${member.tag}**!`
        };
    }
    // Update Database
    await db.clan.setMemberRole(member.userid, newMember.role + 1);
    if (newMember.role === 1) { await db.clan.setMemberRole(clanMember.userid, 1); }
    // Return Embed
    const newRole = ['Trusted Member', 'Clan Leader'][newMember.role];
    return {
        color: logic.color.STATIC.success,
        title: 'Clan Member Promoted!',
        description: `You promoted **${member.tag}** to ${newRole}!${newMember.role === 1 ? '\nYou were demoted to **Trusted Member**.' : ''}`
    };
}
async function handlePromoteCancelButton(memberTag) {
    return {
        color: logic.color.STATIC.failure,
        title: 'Cancelled!',
        description: `${memberTag} was not promoted.`
    };
}

async function sendDemote(interaction, user, clanMember, memberId) {
    // CLAN: DEMOTE
    // Step 1 - Validate Action Valid
    if (!clanMember) { return sendReply(interaction, 'You are not currently in a clan! For more information, use `/help clan`.'); }
    if (clanMember.role !== 2) { return sendReply(interaction, 'You must be the **Clan Leader** to demote clan members!'); }
    if (!memberId) { return sendReply(interaction, 'You must specify the id of the member to demote!'); } // text-based command calls
    if (!parseInt(memberId)) { return sendReply(interaction, 'A member ID must be a **number**!'); } // text-based command calls
    const members = await db.clan.fetchMembers(clanMember.clan);
    if (memberId <= 0 || memberId > members.length) {
        return sendReply(interaction, `**${memberId}** is not a valid member ID! See \`/clan members\` for a list of member IDs.`);
    }
    const member = await db.clan.fetchMemberByMemberId(clanMember.clan, memberId);
    if (member.userid === user.userid) { return sendReply(interaction, 'You cannot demote yourself!'); }
    if (member.role === 0) {
        return sendReply(interaction, 'You cannot demote members. See the `/kick` command.');
    }

    // Step 2 - Send Confirmation Embed
    let embed = {
        color: logic.color.STATIC.default,
        title: `Demote ${member.tag} to Member?`
    };
    const row = new MessageActionRow().addComponents(
        new MessageButton().setCustomId(`${interaction.id} confirm`).setLabel('Confirm').setStyle('SUCCESS'),
        new MessageButton().setCustomId(`${interaction.id} cancel`).setLabel('Cancel').setStyle('DANGER')
    );
    sendReply(interaction, { embeds: [embed], components: [row] }).then(async (sentMessage) => {
        const filter = i => i.customId.split(' ')[0] === interaction.id;

        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 15000 });

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) { return i.reply({ content: 'That button is not for you!', ephemeral: true }); }
            collector.stop();

            const action = i.customId.split(' ')[1];
            let embed2;
            if (action === 'confirm') {
                embed2 = await handleDemoteConfirmButton(clanMember, member);
            } else {
                embed2 = await handleDemoteCancelButton(member.tag);
            }
            await i.update({ embeds: [embed, embed2], components: [] });
        });

        collector.on('end', (collected, reason) => {
            if (reason === 'time') {
                if (interaction.constructor.name === 'Message') { return sentMessage.edit({ embeds: [embed], components: [] }); }
                interaction.editReply({ embeds: [embed], components: [] });
            }
        });
    });
}
async function handleDemoteConfirmButton(clanMember, member) { // clanMember is author
    // Re-Validate Can Demote
    const newMember = await db.clan.fetchMember(member.userid);
    const newClanMember = await db.clan.fetchMember(clanMember.userid);
    if (!newMember || newMember.clan !== clanMember.clan) { // target not in clan anymore
        return {
            color: logic.color.STATIC.failure,
            title: 'Action Cancelled',
            description: `**${member.tag}** is no longer in your clan!`
        };
    }
    if (!newClanMember || newClanMember.clan !== clanMember.clan) { // self not in clan anymore
        return {
            color: logic.color.STATIC.failure,
            title: 'Action Cancelled',
            description: 'You are no longer in this clan!'
        };
    }
    if (newClanMember.role !== 2) { // self lacks rank (not Leader anymore)
        return {
            color: logic.color.STATIC.failure,
            title: 'Action Cancelled',
            description: `You no longer have the rank to demote **${member.tag}**!`
        };
    }
    if (newMember.role !== 1) { // target cannot be demoted further
        return {
            color: logic.color.STATIC.failure,
            title: 'Action Cancelled',
            description: `**${member.tag}** already has the rank of Member!\nTo kick them, use \`/clan kick\`.`
        }
    }
    // Update Database
    await db.clan.setMemberRole(member.userid, 0);
    // Return Embed
    return {
        color: logic.color.STATIC.success,
        title: 'Clan Member Demoted!',
        description: `You demoted **${member.tag}** to Member!`
    };
}
async function handleDemoteCancelButton(memberTag) {
    return {
        color: logic.color.STATIC.failure,
        title: 'Cancelled!',
        description: `${memberTag} was not demoted.`
    };
}

async function sendKick(interaction, user, clanMember, memberId) {
    // CLAN: KICK
    // Step 1 - Validate Action Valid
    if (!clanMember) { return sendReply(interaction, 'You are not currently in a clan! For more information, use `/help clan`.'); }
    if (clanMember.role === 0) { return sendReply(interaction, 'You must be a **Trusted Member** or the **Clan Leader** to kick clan members!'); }
    if (!memberId) { return sendReply(interaction, 'You must specify the id of the member to kick!'); } // text-based command calls
    if (!parseInt(memberId)) { return sendReply(interaction, 'A member ID must be a **number**!'); } // text-based command calls
    const members = await db.clan.fetchMembers(clanMember.clan);
    if (memberId <= 0 || memberId > members.length) {
        return sendReply(interaction, `**${memberId}** is not a valid member ID! See \`/clan members\` for a list of member IDs.`);
    }
    const member = await db.clan.fetchMemberByMemberId(clanMember.clan, memberId);
    if (member.userid === user.userid) { return sendReply(interaction, 'You cannot kick yourself!'); }
    if (clanMember.role <= member.role) {
        return sendReply(interaction, 'You cannot kick members with an equal or higher rank than you!');
    }

    // Step 2 - Send Confirmation Embed
    const clan = await db.clan.fetchClan(clanMember.clan);
    let embed = {
        color: logic.color.STATIC.default,
        title: `Kick ${member.tag}?`
    };
    const row = new MessageActionRow().addComponents(
        new MessageButton().setCustomId(`${interaction.id} confirm`).setLabel('Confirm').setStyle('SUCCESS'),
        new MessageButton().setCustomId(`${interaction.id} cancel`).setLabel('Cancel').setStyle('DANGER')
    );
    sendReply(interaction, { embeds: [embed], components: [row] }).then(async (sentMessage) => {
        const filter = i => i.customId.split(' ')[0] === interaction.id;

        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 15000 });

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) { return i.reply({ content: 'That button is not for you!', ephemeral: true }); }
            collector.stop();

            const action = i.customId.split(' ')[1];
            let embed2;
            if (action === 'confirm') {
                embed2 = await handleKickConfirmButton(clanMember, member, clan);
            } else {
                embed2 = await handleKickCancelButton(member.tag);
            }
            await i.update({ embeds: [embed, embed2], components: [] });
        });

        collector.on('end', (collected, reason) => {
            if (reason === 'time') {
                if (interaction.constructor.name === 'Message') { return sentMessage.edit({ embeds: [embed], components: [] }); }
                interaction.editReply({ embeds: [embed], components: [] });
            }
        });
    });
}
async function handleKickConfirmButton(clanMember, member, clan) { // clanMember is author
    // Re-Validate Can Promote
    const newMember = await db.clan.fetchMember(member.userid);
    const newClanMember = await db.clan.fetchMember(clanMember.userid);
    if (!newMember || newMember.clan !== clanMember.clan) { // target not in clan anymore
        return {
            color: logic.color.STATIC.failure,
            title: 'Action Cancelled',
            description: `**${member.tag}** is no longer in your clan!`
        };
    }
    if (!newClanMember || newClanMember.clan !== clanMember.clan) { // self not in clan anymore
        return {
            color: logic.color.STATIC.failure,
            title: 'Action Cancelled',
            description: 'You are no longer in this clan!'
        };
    }
    if (newClanMember.role <= newMember.role) { // self lacks rank
        return {
            color: logic.color.STATIC.failure,
            title: 'Action Cancelled',
            description: `You no longer have the rank to kick **${member.tag}**!`
        };
    }
    // Update Database
    await db.clan.removeMember(member.userid);
    if (clan.is_full) { await db.clan.setClanColumn(clan.id, 'is_full', false); }
    // Return Embed
    return {
        color: logic.color.STATIC.success,
        title: 'Clan Member Kicked!',
        description: `**${member.tag}** is no longer in your clan.`
    };
}
async function handleKickCancelButton(memberTag) {
    return {
        color: logic.color.STATIC.failure,
        title: 'Cancelled!',
        description: `${memberTag} was not kicked.`
    };
}

async function sendPasswordCheck(interaction, clanMember) {
    if (!clanMember) { return sendReply(interaction, 'You are not currently in a clan! For more information, use `/help clan`.'); }
    // CLAN: PASSWORD - CHECK
    // Step 1 - Validate Permissions
    if (clanMember.role === 0) { return sendReply(interaction, 'You must be a Trusted Member or Clan Leader to view the clan password!'); }
    // Step 2 - Send Message
    const clan = await db.clan.fetchClan(clanMember.clan);
    sendReply(interaction, { content: clan.password ? `The join password for the clan ${clan.name} is **${clan.password}**` : `${clan.name} does not have a join password.`, ephemeral: true });
}

async function sendPasswordGenerate(interaction, clanMember) {
    if (!clanMember) { return sendReply(interaction, 'You are not currently in a clan! For more information, use `/help clan`.'); }
    // CLAN: PASSWORD - GENERATE
    // Step 1 - Validate Permissions
    if (clanMember.role === 0) { return sendReply(interaction, 'You must be a Trusted Member or Clan Leader to generate a new clan password!'); }
    // Step 2 - Update Database
    await db.clan.setClanPassword(clanMember.clan, generateClanPassword());
    // Step 3 - Send Message
    sendReply(interaction, 'A new join password was generated for your clan! Check it out with `/clan password check`.');
}

async function sendPasswordDisable(interaction, clanMember) {
    if (!clanMember) { return sendReply(interaction, 'You are not currently in a clan! For more information, use `/help clan`.'); }
    // CLAN: PASSWORD - DISABLE
    // Step 1 - Validate Permissions/Password Already Disabled
    if (clanMember.role === 0) { return sendReply(interaction, 'You must be a Trusted Member or Clan Leader to disable the clan password!'); }
    const clan = await db.clan.fetchClan(clanMember.clan);
    if (!clan.password) { return sendReply(interaction, 'Join passwords are already disabled for your clan!'); }
    // Step 2 - Update Database
    await db.clan.setClanPassword(clanMember.clan, null);
    // Step 3 - Send Message
    sendReply(interaction, 'Players can now join your clan without a password!');
}

async function sendCampaign(interaction, user, clanMember) {
    if (!clanMember) { return sendReply(interaction, 'You are not currently in a clan! For more information, use `/help clan`.'); }
    // CLAN: CAMPAIGN
    // Step 1 - Fetch Variables
    const clan = await db.clan.fetchClan(clanMember.clan);
    const CampaignData = api.campaign.getCampaignData(clan.campaign_stage);
    const bonusClanPoints = logic.clan.getBonusClanPoints(clan);
    // Case: No more campaigns left
    if (!CampaignData) {
        let embed = {
            color: logic.color.STATIC.clan,
            title: `Campaign Stage ${clan.campaign_stage} - (Coming Soon)`,
            description: `Congratulations, your clan has completed all available stages!\n\nKeep an eye out for updates!`
        };
        return sendReply(interaction, { embeds: [embed] });
    }

    // Step 2 - Process Variables
    let campaignProgress = {}, locations = {}, totalCaught = 0, totalRequired = 0;
    clan.campaign_progress.forEach(id => campaignProgress[id] = (campaignProgress[id] || 0) + 1);
    for (const [fishName, qtRequired] of CampaignData.requirements) {
        const FishData = api.fish.getFishDataByName(fishName);
        if (!locations[FishData.location]) { locations[FishData.location] = {}; }
        locations[FishData.location][fishName] = { progress: Math.min(campaignProgress[FishData.id] || 0, qtRequired), required: qtRequired }
    }
    let embedFields = [], locationIds = Object.keys(locations);
    for (let i=0; i<Object.keys(locations).length; i++) {
        if (i%2 === 1) { embedFields.push({ name: '\u200b', value: '\u200b', inline: true }); }
        const LocationData = api.fish.getLocationData(locationIds[i]);
        embedFields.push({
            name: `Location ${locationIds[i]} - ${LocationData.name}`,
            value: Object.entries(locations[locationIds[i]]).map(([key, value]) => {
                totalCaught += value.progress; totalRequired += value.required;
                return `${logic.text.capitalizeWords(key.replace(/_/g, ' '))} (${value.progress}/${value.required})`;
            }).join('\n'),
            inline: true
        });
    }

    // Step 2A - Clan Avatar
    const members = await db.clan.fetchMembers(clanMember.clan);
    const leader = members.filter(obj => obj.role === 2)[0];
    const clanAvatarID = await db.cosmetics.getEquippedCosmetic(leader.userid, 1);
    const clanAvatarUrl = clanAvatarID === null ? null : `${api.images.CLOUD_PATH}/cosmetics/clan_avatar/${api.cosmetics.getCosmeticSrc('clan_avatar', clanAvatarID)}.png`;
    
    // Step 3 - Send Embed
    const rewards = JSON.parse(JSON.stringify(CampaignData.rewards)); // shallow copy
    const complete = totalCaught === totalRequired;
    let embed = {
        color: complete ? logic.color.STATIC.success : logic.color.STATIC.clan,
        title: `Campaign Stage ${clan.campaign_stage} - (\
${complete ? 'Complete!' : `${Math.round(totalCaught/totalRequired*100)}% Complete`})`, 
        author: {
            name: clan.name,
            icon_url: clanAvatarUrl
        },
        description: `**${CampaignData.name}**
${CampaignData.description}
\n**Rewards**\n${rewards.clanPoints} Clan Points :shield:\
${bonusClanPoints ? `\n${bonusClanPoints} Bonus Clan Points :shield:` : ''}\
${rewards.lollipops ? `\n${rewards.lollipops} Quest Points :lollipop:` : ''}\
${rewards.coins ? `\n${rewards.coins} Coins :coin:` : ''}`,
        fields: embedFields,
        footer: {
            text: complete && clanMember.role === 0 ? 'Campaign rewards must be claimed by a Trusted Member or the Clan Leader.' : ''
        }
    };

    const rowArr = complete ? [new MessageActionRow().addComponents(
        new MessageButton().setCustomId(`${interaction.id} claim`).setLabel('Claim Rewards').setStyle('SUCCESS').setDisabled(clanMember.role === 0),
    )] : [];

    sendReply(interaction, { embeds: [embed], components: rowArr }).then(async (sentMessage) => {
        if (!complete || clanMember.role === 0) { return; }
        rewards.clanPoints += bonusClanPoints;

        const filter = i => i.customId.split(' ')[0] === interaction.id;

        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 10000 });

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) { return i.reply({ content: 'That button is not for you!', ephemeral: true }); }
            collector.stop();

            let embed2;
            embed2 = await handleCampaignClaimButton(clan, rewards);
            await i.update({ embeds: [embed, embed2], components: [] });
        });

        collector.on('end', (collected, reason) => {
            if (reason === 'time') {
                if (interaction.constructor.name === 'Message') { return sentMessage.edit({ embeds: [embed], components: [] }); }
                interaction.editReply({ embeds: [embed], components: [] });
            }
        });
    });
}
async function handleCampaignClaimButton(clan, rewards) {
    // Validate Still On Same Campaign (not claimed yet)
    const newClan = await db.clan.fetchClan(clan.id);
    if (newClan.campaign_stage !== clan.campaign_stage) {
        return {
            color: logic.color.STATIC.failure,
            title: 'Action Failed!',
            description: 'Rewards for this stage have already been claimed!'
        };
    }
    // Update Database
    const memberIds = (await db.clan.fetchMembers(clan.id)).map(obj => obj.userid);
    await db.clan.updateClanColumns(clan.id, { clan_points: rewards.clanPoints, campaign_stage: 1 });
    await db.clan.resetClanCampaignProgress(clan.id);
    db.users.updateColumnsBulk(memberIds, { coins: rewards.coins, lollipops: rewards.lollipops });
    // Return Embed
    return {
        color: logic.color.STATIC.success,
        title: `Claimed Rewards for Stage ${clan.campaign_stage}!`,
        description: `Your clan gained **+${rewards.clanPoints} Clan Points**! :shield:\
${rewards.lollipops ? `\nEach member gained **+${rewards.lollipops} Quest Points**! :lollipop:` : ''}\
${rewards.coins ? `\nEach member gained **+${rewards.coins} Coins**! :coin:` : ''}`
    };
}

async function sendPerks(interaction, user, clanMember) {
    if (!clanMember) { return sendReply(interaction, 'You are not currently in a clan! For more information, use `/help clan`.'); }
    // CLAN: PERKS
    // Step 1 - Fetch Variables
    const clan = await db.clan.fetchClan(clanMember.clan);
    const perks = logic.clan.getAllPerks(clan);

    // Step 1A - Clan Avatar
    const members = await db.clan.fetchMembers(clanMember.clan);
    const leader = members.filter(obj => obj.role === 2)[0];
    const clanAvatarID = await db.cosmetics.getEquippedCosmetic(leader.userid, 1);
    const clanAvatarUrl = clanAvatarID === null ? null : `${api.images.CLOUD_PATH}/cosmetics/clan_avatar/${api.cosmetics.getCosmeticSrc('clan_avatar', clanAvatarID)}.png`;

    // Step 2 - Send Embed
    let embed = {
        color: logic.color.STATIC.clan,
        title: 'Clan Perks Summary',
        author: {
            name: clan.name,
            icon_url: clanAvatarUrl
        },
        description: `${perks.fish_cd ? `**-${perks.fish_cd}%** fishing cooldown :alarm_clock:\n`: ''}\
${perks.coin_bonus ? `**+${perks.coin_bonus}%** coins from fishing :coin:\n` : ''}\
${perks.exp_bonus ? `**+${perks.exp_bonus}%** exp from fishing :star:\n` : ''}\
${perks.quest_cd ? `**-${perks.quest_cd}%** quest refresh cooldown :arrows_counterclockwise:\n` : ''}\
${perks.aquarium_capacity ? `**+${perks.aquarium_capacity}%** aquarium coin capacity :truck:\n` : ''}\
${perks.vote_bonus ? `**+${perks.vote_bonus}** quest point${perks.vote_bonus !== 1 ? 's' : ''} per vote :lollipop:\n` : ''}\
${perks.campaign_mba ? `**+${perks.campaign_mba}** clan points per campaign :shield:\n` : ''}\
${perks.quest_mba ? `**+${perks.quest_mba}%** quest rewards :scroll:\n` : ''}\
${perks.max_weight ? `**+${perks.max_weight}%** max weight :fishing_pole_and_fish:\n` : ''}\
${perks.card_storage_bonus ? `**+${perks.card_storage_bonus}** card box storage :card_box:\n` : ''}`
    };
    sendReply(interaction, { embeds: [embed] });
}

async function sendShop(interaction, user, clanMember) {
    if (!clanMember) { return sendReply(interaction, 'You are not currently in a clan! For more information, use `/help clan`.'); }
    // CLAN: SHOP
    // Step 1 - Fetch Variables
    const BUY_MAP = { 'fish_cd': 'cooldown', 'coin_bonus': 'coin', 'exp_bonus': 'exp', 'vote_bonus': 'vote', 'campaign_mba': 'campaign', 'quest_mba': 'quest', 'card_storage_bonus': 'card' };
    const clan = await db.clan.fetchClan(clanMember.clan);
    const ShopData = api.clan.getAllClanShopData();
    let embedFields = [];

    for (const [perk, data] of Object.entries(ShopData.perks)) {
        const currentLevel = data.levels[clan[perk]];
        const nextLevel = data.levels[clan[perk] + 1];
        if (!nextLevel) { continue; }
        const purchaseable = clan.clan_points >= nextLevel.price;
        embedFields.push({
            name: `${purchaseable ? ':white_check_mark:' : ':credit_card:'}  ${data.shopName} Lvl. ${clan[perk] + 1}`,
            value: `(${nextLevel.price}) ${data.desc.replace('{OLD}', currentLevel.value).replace('{NEW}', nextLevel.value)} ${purchaseable ? ` \`/clan buy ${BUY_MAP[perk]}\`` : ''}`
        });
    }

    // Step 1A - Clan Avatar
    const members = await db.clan.fetchMembers(clanMember.clan);
    const leader = members.filter(obj => obj.role === 2)[0];
    const clanAvatarID = await db.cosmetics.getEquippedCosmetic(leader.userid, 1);
    const clanAvatarUrl = clanAvatarID === null ? null : `${api.images.CLOUD_PATH}/cosmetics/clan_avatar/${api.cosmetics.getCosmeticSrc('clan_avatar', clanAvatarID)}.png`;

    // Step 2 - Send Embed
    let embed = {
        color: logic.color.STATIC.clan,
        title: 'Clan Shop',
        author: {
            name: clan.name,
            icon_url: clanAvatarUrl
        },
        description: `**${clan.clan_points} Clan Point${clan.clan_points !== 1 ? 's' : ''}** :shield:`,
        fields: embedFields
    }
    sendReply(interaction, { embeds: [embed] });
}

async function sendBuy(interaction, user, clanMember, category) {
    if (!clanMember) { return sendReply(interaction, 'You are not currently in a clan! For more information, use `/help clan`.'); }
    // CLAN: SHOP
    // Step 1 - Validate User Can Buy
    if (clanMember.role === 0) { return sendReply(interaction, 'You must be a **Trusted Member** or the **Clan Leader** to buy clan perks!'); }
    const BUY_MAP = { 'cooldown': 'fish_cd', 'coin': 'coin_bonus', 'exp': 'exp_bonus', 'vote': 'vote_bonus', 'campaign': 'campaign_mba', 'quest': 'quest_mba', 'card': 'card_storage_bonus' };
    const clan = await db.clan.fetchClanByUserid(user.userid);
    if (!category) { return sendReply(interaction, 'You must specify the perk you wish to purchase!'); } // text-based command calls
    const perkName = BUY_MAP[category];
    if (!perkName) { return sendReply(interaction, `**${category}** is not a valid category!`); } // text-based command calls
    const PerkData = api.clan.getPerkData(perkName);
    const currentLevel = PerkData.levels[clan[perkName]];
    const nextLevel = PerkData.levels[clan[perkName] + 1];
    if (!nextLevel)  { return sendReply(interaction, 'Your clan has already maxed out that perk!'); }
    if (nextLevel.price > clan.clan_points) { return sendReply(interaction, 'Not enough clan points!'); }

    // Step 2 - Update Database
    let instructions = { clan_points: -nextLevel.price };
    instructions[perkName] = 1;
    await db.clan.updateClanColumns(clan.id, instructions);

    // Step 2A - Clan Avatar
    const members = await db.clan.fetchMembers(clanMember.clan);
    const leader = members.filter(obj => obj.role === 2)[0];
    const clanAvatarID = await db.cosmetics.getEquippedCosmetic(leader.userid, 1);
    const clanAvatarUrl = clanAvatarID === null ? null : `${api.images.CLOUD_PATH}/cosmetics/clan_avatar/${api.cosmetics.getCosmeticSrc('clan_avatar', clanAvatarID)}.png`;

    // Step 3 - Send Embed
    let embed = {
        color: logic.color.STATIC.clan,
        title: `Purchased ${PerkData.shopName} Lvl. ${clan[perkName] + 1}`,
        author: {
            name: clan.name,
            icon_url: clanAvatarUrl
        },
        description: `${PerkData.desc.replace('{OLD}', currentLevel.value).replace('{NEW}', nextLevel.value)}
Price: ${nextLevel.price} :shield:
Remaining Clan Points: ${clan.clan_points - nextLevel.price} :shield:`
    };
    sendReply(interaction, { embeds: [embed] });
}

async function sendBoat(interaction, user, clanMember) {
    if (!clanMember) { return sendReply(interaction, 'You are not currently in a clan! For more information, use `/help clan`.'); }
    // CLAN: BOAT
    // Step 1 - Fetch Variables
    const clan = await db.clan.fetchClan(clanMember.clan);
    const HullData = api.clan.getHullData(clan.hull);
    const NextHullData = api.clan.getHullData(clan.hull + 1);
    const ContainerData = api.clan.getContainerData(clan.container);
    const NextContainerData = api.clan.getContainerData(clan.container + 1);
    const EngineData = api.clan.getEngineData(clan.engine);
    const NextEngineData = api.clan.getEngineData(clan.engine + 1);
    const PropellerData = api.clan.getPropellerData(clan.propeller);
    const NextPropellerData = api.clan.getPropellerData(clan.propeller + 1);
    const ClanLocationData = api.clan.getClanLocationData(clan.boat_location);

    const timeElapsed = Date.now() - parseInt(clan.boat_start_time);
    let status; // 0 = idle, 1 = trip, 2 = unloading
    if (timeElapsed >= PropellerData.cooldown + 86400000) {
        status = 0;
    } else if (timeElapsed < PropellerData.cooldown) {
        status = 1;
    } else {
        status = 2;
    }

    // Step 1A - Clan Avatar
    const members = await db.clan.fetchMembers(clanMember.clan);
    const leader = members.filter(obj => obj.role === 2)[0];
    const clanAvatarID = await db.cosmetics.getEquippedCosmetic(leader.userid, 1);
    const clanAvatarUrl = clanAvatarID === null ? null : `${api.images.CLOUD_PATH}/cosmetics/clan_avatar/${api.cosmetics.getCosmeticSrc('clan_avatar', clanAvatarID)}.png`;

    // Step 2 - Render Canvas
    const canvasBuffer = await createClanBoatCanvas(clan, status, clanAvatarID);
    const attachment = new MessageAttachment(canvasBuffer, 'clan_boat.png');

    // Step 3 - Embed Fields
    let embedFields = [];
    embedFields.push({
        name: `${logic.text.capitalizeWords(HullData.name)} Hull`,
        value: `${NextHullData ? `\`${Math.floor(clan.hull_progress / NextHullData.price * 100)}% to next (${clan.hull_progress}/${NextHullData.price})\`` : '`maximum level`'}
:earth_asia: Accessible Locations: ${clan.hull}`,
        inline: true
    });
    embedFields.push({
        name: `${logic.text.capitalizeWords(ContainerData.name)} Container`,
        value: `${NextContainerData ? `\`${Math.floor(clan.container_progress / NextContainerData.price * 100)}% to next (${clan.container_progress}/${NextContainerData.price})\`` : '`maximum level`'}
:package: Capacity: ${ContainerData.capacity}`,
        inline: true
    });
    embedFields.push({ name: '\u200b', value: '\u200b', inline: true });
    embedFields.push({
        name: `${logic.text.capitalizeWords(EngineData.name)} Engine`,
        value: `${NextEngineData ? `\`${Math.floor(clan.engine_progress / NextEngineData.price * 100)}% to next (${clan.engine_progress}/${NextEngineData.price})\`` : '`maximum level`'}
:fuelpump: Fuel Efficiency: ${Math.round(EngineData.efficiency * 100)}%`,
        inline: true
    });
    embedFields.push({
        name: `${logic.text.capitalizeWords(PropellerData.name)} Propeller`,
        value: `${NextPropellerData ? `\`${Math.floor(clan.propeller_progress / NextPropellerData.price * 100)}% to next (${clan.propeller_progress}/${NextPropellerData.price})\`` : '`maximum level`'}
:alarm_clock: Trip Time: ${logic.text.millisToDaysAndHours(PropellerData.cooldown)}`,
        inline: true
    });
    embedFields.push({ name: '\u200b', value: '\u200b', inline: true });
    if (status === 1) {
        embedFields.push({
            name: `Current Trip`,
            value: `:map: Destination: ${ClanLocationData.name} (${clan.boat_location})
:clock10: Trip Progress: ${(Math.floor(timeElapsed/PropellerData.cooldown*10000)/100).toFixed(2)}%`
        });
    } else if (status === 2) {
        embedFields.push({
            name: `Current Trip`,
            value: `:map: Destination: ${ClanLocationData.name} (${clan.boat_location})
:clock10: Trip Progress: 100% (Complete!)
:clock10: Unloading Progress: ${(Math.floor((timeElapsed - PropellerData.cooldown)/86400000*10000)/100).toFixed(2)}%`
        });
    }

    // Step 4 - Send Embed
    const AllClanLocationData = api.clan.getAllClanLocationData();
    let rowArr = [];
    let isNewAccount;
    if (status === 0 && clanMember.role !== 0) {
        for (let i=1; i<=clan.hull; i++) {
            if ((i-1) % 3 == 0) { rowArr.push(new MessageActionRow()); }
            const fuelCost = Math.ceil(AllClanLocationData[i].dist / EngineData.efficiency);
            const enoughFuel = fuelCost <= clan.fuel;
            rowArr[Math.floor((i-1) / 3)].addComponents(new MessageButton().setCustomId(`${interaction.id} ${i}`).setLabel(`${i} - ${AllClanLocationData[i].name} [${fuelCost}]`).setStyle('SECONDARY').setDisabled(!enoughFuel));
        }
    } else if (status === 2) {
        isNewAccount = clanMember.joined > clan.boat_start_time;
        const buttonLabel = isNewAccount ? 'Cannot Claim (Recently Joined)' : (clanMember.claimed ? 'Claimed' : 'Claim');
        rowArr.push(new MessageActionRow().addComponents(
            new MessageButton().setCustomId(`${interaction.id} claim`).setLabel(buttonLabel).setStyle(isNewAccount ? 'DANGER' : 'SUCCESS').setDisabled(isNewAccount || clanMember.claimed)
        ));
    }

    let embed = {
        color: [logic.color.STATIC.clan, logic.color.STATIC.clanLocation[clan.boat_location - 1], logic.color.STATIC.success][status],
        title: `Clan Boat (${['Ready', 'Phase 1/2: Fishing', 'Phase 2/2: Unloading'][status]})`,
        author: {
            name: clan.name,
            icon_url: clanAvatarUrl
        },
        description: `:oil: Fuel Available: ${clan.fuel} units`,
        fields: embedFields,
        image: {
            url: `attachment://clan_boat.png`
        },
        footer: {
            text: 'For more info see /help boat'
        }
    };
    sendReply(interaction, { embeds: [embed], files: [attachment], components: rowArr }).then(async (sentMessage) => {
        if (status === 0 && clanMember.role !== 0) { // launching boat
            const filter = i => i.customId.split(' ')[0] === interaction.id;

            const collector = interaction.channel.createMessageComponentCollector({ filter, time: 20000 });

            collector.on('collect', async i => {
                if (i.user.id !== interaction.user.id) { return i.reply({ content: 'That button is not for you!', ephemeral: true }); }
                collector.stop();

                const clanLocationId = parseInt(i.customId.split(' ')[1]);
                const embed2 = await handleBoatLocationButton(clan, clanLocationId);
                const row = new MessageActionRow().addComponents(
                    new MessageButton().setCustomId(`${i.id} confirm`).setLabel('Confirm').setStyle('SUCCESS'),
                    new MessageButton().setCustomId(`${i.id} cancel`).setLabel('Cancel').setStyle('DANGER')
                );
                await i.update({ embeds: [embed, embed2], components: [row] }).then(async (sentReply) => {
                    const filter2 = i2 => i2.customId.split(' ')[0] === i.id;

                    const collector = i.channel.createMessageComponentCollector({ filter2, time: 20000 });

                    collector.on('collect', async i2 => {
                        if (i2.user.id !== i.user.id) { return i2.reply({ content: 'That button is not for you!', ephemeral: true }); }
                        collector.stop();

                        const action = i2.customId.split(' ')[1];
                        if (action === 'confirm') {
                            const embed3 = await handleBoatConfirmButton(clan, clanLocationId);
                            await i2.update({ embeds: [embed, embed2, embed3], components: []});
                        } else {
                            const embed3 = await handleBoatCancelButton();
                            await i2.update({ embeds: [embed, embed2, embed3], components: [] });
                        }
                    });

                    collector.on('end', (collected, reason) => {
                        if (reason === 'time') {
                            const embed3 = {
                                color: logic.color.STATIC.failure,
                                title: 'Timed Out',
                                description: 'Action cancelled!'
                            };
                            if (interaction.constructor.name === 'Message') { return sentMessage.edit({ embeds: [embed, embed2, embed3], components: [] }); }
                            interaction.editReply({ embeds: [embed, embed2, embed3], components: [] });
                        }
                    });
                });
            });

            collector.on('end', (collected, reason) => {
                if (reason === 'time') {
                    if (interaction.constructor.name === 'Message') { return sentMessage.edit({ embeds: [embed], components: [] }); }
                    interaction.editReply({ embeds: [embed], components: [] });
                }
            });
        } else if (status === 2 && !isNewAccount && !clanMember.claimed) { // claiming rewards
            const filter = i => i.customId.split(' ')[0] === interaction.id;

            const collector = interaction.channel.createMessageComponentCollector({ filter, time: 20000 });

            collector.on('collect', async i => {
                if (i.user.id !== interaction.user.id) { return i.reply({ content: 'That button is not for you!', ephemeral: true }); }
                collector.stop();
                await i.deferUpdate();

                const embed2 = await handleBoatClaimButton(clan, clanMember, user, interaction);
                await i.editReply({ embeds: [embed, embed2], components: [] });
            });

            collector.on('end', (collected, reason) => {
                if (reason === 'time') {
                    if (interaction.constructor.name === 'Message') { return sentMessage.edit({ embeds: [embed], components: [] }); }
                    interaction.editReply({ embeds: [embed], components: [] });
                }
            });
        }
    });
}
async function handleBoatLocationButton(clan, clanLocationId) {
    const ClanLocationData = api.clan.getClanLocationData(clanLocationId);
    const EngineData = api.clan.getEngineData(clan.engine);
    const PropellerData = api.clan.getPropellerData(clan.propeller);

    const fuelCost = Math.ceil(ClanLocationData.dist / EngineData.efficiency);

    return {
        color: logic.color.STATIC.clanLocation[clanLocationId - 1],
        title: `Send boat to ${ClanLocationData.name}?`,
        description: `:alarm_clock: Trip Time: ${logic.text.millisToDaysAndHours(PropellerData.cooldown)}
:truck: Unloading Time: 1 day
:fuelpump: Fuel Cost: ${fuelCost} units`
    };
}
async function handleBoatConfirmButton(clan, clanLocationId) {
    // Check if boat has already been sent
    const newClan = await db.clan.fetchClan(clan.id);
    if (newClan.boat_start_time !== clan.boat_start_time) {
        return {
            color: logic.color.STATIC.failure,
            title: 'The Clan Boat is already on a trip!',
            description: 'Action cancelled!'
        };
    }
    // Update Database
    await db.clan.setBoatClaimableToTrue(clan.id); 

    const ClanLocationData = api.clan.getClanLocationData(clanLocationId);
    const EngineData = api.clan.getEngineData(clan.engine);
    const PropellerData = api.clan.getPropellerData(clan.propeller);

    const fuelCost = Math.ceil(ClanLocationData.dist / EngineData.efficiency);

    await db.clan.setClanColumns(clan.id, {
        fuel: newClan.fuel-fuelCost,
        boat_location: clanLocationId,
        boat_start_time: Date.now()
    });
    // Create Embed
    return {
        color: logic.color.STATIC.clanLocation[clanLocationId - 1],
        title: `Success! Sent boat to ${ClanLocationData.name}!`,
        description: `Collect your rewards in **${logic.text.millisToDaysAndHours(PropellerData.cooldown)}**!
\nCheck boat status with \`/clan boat\`
Your clan will not be able to upgrade the boat until it comes back.`
    };
}
async function handleBoatCancelButton() {
    return {
        color: logic.color.STATIC.failure,
        title: 'Cancelled',
        description: 'Action cancelled!'
    };
}
async function handleBoatClaimButton(clan, clanMember, user, interaction) {
    // make sure hasn't already claimed
    const newClanMember = await db.clan.fetchMember(clanMember.userid);
    if (newClanMember.claimed) {
        return {
            color: logic.color.STATIC.failure,
            title: 'Denied',
            description: 'You have already claimed rewards for this trip!'
        };
    }
    // make sure boat hasn't already left on a new journey
    const newClan = await db.clan.fetchClan(clan.id);
    if (newClan.boat_start_time !== clan.boat_start_time) {
        return {
            color: logic.color.STATIC.failure,
            title: 'Denied',
            description: 'Your boat is no longer in the Unloading stage!'
        };
    }
    user = await db.users.fetchUser(user.userid); // refresh user
    clanMember = newClanMember; // refresh clanMember
    await db.clan.setMemberColumn(user.userid, 'claimed', true);

    // Generate Rewards
    const ring = await db.rings.getRing(clanMember.boat_ring);
    const ContainerData = api.clan.getContainerData(clan.container);
    const rewards = logic.generation.generateBoatRewards(clan.boat_location, ContainerData.capacity, user.level);

    const ClanLocationData = api.clan.getClanLocationData(clan.boat_location);
    const AllFishData = [null].concat(api.fish.getAllUnlockedFishData(user.level));
    const maxWeight = await getMaxWeight(user, clan, false); // event does not affect this
    const LineData = api.equipment.getLineData(user.line);
    const HookData = api.equipment.getHookData(user.hook);
    const SwivelData = api.equipment.getSwivelData(user.swivel);
    const FishValues = await db.aquarium.getFish(user.userid, AllFishData.filter(obj => obj && ClanLocationData.locations.includes(obj.location)).map(obj => obj.name));

    let cardCount = (await db.cards.getAllUserCards(user.userid)).length;
    let totals = { coins: 0, exp: 0, catches: 0, weight: 0 };
    let countedToQuest = false;
    const bounty = await db.bounty.getCurrentEntry();
    let bountyStr = '';
    const CampaignData = api.campaign.getCampaignData(clan.campaign_stage);
    let campaignStr = '';
    let campaignFish = null;
    let baitTotals = {};
    let updatedLocations = [];

    let rewardMessages = rewards.map(obj => {
        if (obj.rewardType === 'fish') {
            // calculate fish basics
            const FishData = AllFishData[obj.fish];
            const tier = logic.text.rToTier(obj.r);
            const fishWeight = calculateFishWeight(obj.r, FishData);
            const lineSnapped = fishWeight > maxWeight + (SwivelData && FishData.family === 'shark' ? SwivelData.bonus : 0);
            const coins = lineSnapped ? 0 : Math.ceil(fishWeight * FishData.value * HookData.multiplier);
            totals.coins += coins;
            totals.exp += lineSnapped ? 0 : Math.ceil(Math.sqrt(coins * 10)) + LineData.bonus;
            totals.catches++;
            totals.weight += fishWeight * 1000;

            // handle aquarium entry
            let recordStr = '';
            if (!lineSnapped && obj.r > FishValues[FishData.name]) {
                recordStr = ':truck:';
                FishValues[FishData.name] = obj.r;
                db.aquarium.setColumn(user.userid, FishData.name, obj.r);
                
                if (!updatedLocations.includes(FishData.location)) {
                    updatedLocations.push(FishData.location);
                }
            }

            // handle cards
            let ringStr = '';
            if (!lineSnapped && ring) {
                const RingData = api.equipment.getRingData(ring.ring_type);
                let cardDropChance = RingData.classBoost[FishData.sizeClass-1] + ring[['s', 'm', 'l', 'xl'][FishData.sizeClass-1]];
                if (RingData.dropMultiplier) { cardDropChance *= RingData.dropMultiplier; }
                const cardStorage = 10 + logic.clan.getCardStorageBonus(clan);
                if (Math.random() * 100 < cardDropChance) {
                    if (cardCount >= cardStorage) { // too many cards
                        ringStr = ':x::card_index:';
                    } else {
                        ringStr = ':card_index:';
                        const grade = logic.generation.generateCardGrade(ring, RingData);
                        db.cards.addCard({ userid: user.userid, fish: obj.fish, r: obj.r, grade: grade });
                        cardCount++;
                    }
                }
            }

            // handle quest
            if (!lineSnapped && user.quest_type !== -1 && user.quest_progress !== user.quest_requirement) {
                if (user.quest_type === 0 && obj.r >= [0.3, 0.6, 0.75, 0.9][user.quest_data]) {
                    user.quest_progress += 1;
                    countedToQuest = true;
                } else if (user.quest_type === 1) {
                    user.quest_progress = Math.min(Math.round(user.quest_progress + fishWeight*1000), user.quest_requirement);
                    countedToQuest = true;
                } else if (user.quest_type === 2 && user.quest_data === obj.fish) {
                    user.quest_progress += 1;
                    countedToQuest = true;
                }
            }

            // handle bounty
            if (!lineSnapped && user.level >= 10 && user.bounty !== bounty.id) {
                if (FishData.name === bounty.fish && obj.r >= TIER_VALUES[bounty.tier]) {
                    user.bounty = bounty.id;
                    bountyStr = `\n**Bounty Complete!** You got ${bounty.reward} :lollipop:`;
                }
            }

            // handle campaign
            if (!lineSnapped && Math.floor(Date.now() / 86400000) !== clanMember.last_campaign_catch && Date.now() - parseInt(clanMember.joined) > 86400000) {
                if (CampaignData && CampaignData.requirements.map(entry => entry[0]).includes(FishData.name)) {
                    const campaignFishRequired = CampaignData.requirements.filter((entry) => entry[0] === FishData.name)[0][1];
                    const campaignFishCaught = clan.campaign_progress.reduce((a, b) => b === FishData.id ? a+1 : a, 0);
                    if (campaignFishCaught < campaignFishRequired) {
                        clanMember.last_campaign_catch = Math.floor(Date.now() / 86400000);
                        campaignFish = FishData.id;
                        campaignStr = '\n+1 campaign catch! :golf:';
                        isCampaignCatch = true;
                    }
                }
            }

            // return text
            const emoji = lineSnapped ? api.emoji.FISH_ESCAPED : api.emoji[`TIER_${tier}`];
            return [emoji, logic.text.capitalizeWords(FishData.name.replace(/_/g, ' ')), '-', logic.text.kgToWeight(fishWeight), recordStr, ringStr].join(' ');
        } else if (obj.rewardType === 'fishNotUnlocked') {
            return `:no_entry_sign: Unknown Fish (Location ${obj.location})`;
        } else if (obj.rewardType === 'bait') {
            if (!(obj.bait in baitTotals)) {
                baitTotals[obj.bait] = 1;
            } else {
                baitTotals[obj.bait]++;
            }
            return ':worm: ' + logic.text.capitalizeWords(obj.bait.replace(/_/g, ' ')) + ' x1';
        }
    }).join('\n');

    // update fisher score
    for (let locationId of updatedLocations) {
        const AllFishData = api.fish.getFishDataFromLocation(locationId);
        FishNames = AllFishData.map(obj => obj.name);
        const allFish = Object.fromEntries(Object.entries(FishValues).filter(entry => FishNames.includes(entry[0])));
        const locationScore = calculateFisherScore(allFish, AllFishData);
        await db.scores.setLocationScore(user.userid, locationId, locationScore);
    }
    db.scores.updateOverallScore(user.userid);

    totals.bonusCoins = Math.ceil(totals.coins * logic.clan.getCoinBonus(clan)/100);
    totals.bonusExp = Math.ceil(totals.exp * logic.clan.getExpBonus(clan)/100);

    rewardMessages += `\n\nGained ${totals.coins}${totals.bonusCoins ? ` (+${totals.bonusCoins})` : ''} coins! :coin:
Gained ${totals.exp}${totals.bonusExp ? ` (+${totals.bonusExp})` : ''} exp! :star:`;

    // handle level-ups
    user.exp += totals.exp + totals.bonusExp;
    let expRequired = api.leveldata.getPlayerLevelData(user.level + 1).expRequired;
    while (user.exp >= expRequired) {
        user.level++; 
        user.exp -= expRequired;
        expRequired = api.leveldata.getPlayerLevelData(user.level + 1).expRequired;
        rewardMessages += `\nLeveled up to Lvl. ${user.level} :arrow_up:`;
        if (user.level % 10 === 0) { rewardMessages += '\nUnlocked a new location! :map:' }
    }

    // quest & bounty message
    if (countedToQuest) {
        if (user.quest_type === 0 || user.quest_type === 2) {
            rewardMessages += `\nCounts towards quest! (now ${user.quest_progress}/${user.quest_requirement}) :clock1:`;
        } else if (user.quest_type === 1) {
            rewardMessages += `\nCounts towards quest! (now ${user.quest_progress/1000}/${Math.round(user.quest_requirement/1000)}kg) :clock1:`;
        }
    }
    rewardMessages += bountyStr;
    rewardMessages += campaignStr;
    
    // Update DB
    if (bountyStr !== '') {
        db.bounty.incrementCompleted();
    }
    if (campaignStr !== '') {
        db.clan.setMemberColumn(user.userid, 'last_campaign_catch', Math.floor(Date.now() / 86400000));
        db.clan.updateMemberColumn(user.userid, 'campaign_catches', 1);
        db.clan.appendToClanCampaignProgress(clan.id, campaignFish);
    }
    db.users.updateColumns(user.userid, {
        coins: totals.coins + totals.bonusCoins,
        weight_caught: Math.round(totals.weight),
        fish_caught: totals.catches,
        lollipops: bountyStr !== '' ? bounty.reward : 0
    });
    db.users.setColumns(user.userid, {
        exp: user.exp,
        level: user.level,
        quest_progress: user.quest_progress,
        bounty: user.bounty
    });
    if (Object.keys(baitTotals).length !== 0) {
        db.bait.updateColumns(user.userid, baitTotals);
    }
    db.clan.updateClanColumns(clan.id, { fish_caught: totals.catches });

    // Return Embed
    return {
        color: logic.color.STATIC.success,
        title: 'Claimed Rewards!',
        author: {
            name: `${interaction.user.tag} (Lvl. ${user.level})`,
            icon_url: interaction.user.displayAvatarURL()
        },
        description: rewardMessages
    };
}