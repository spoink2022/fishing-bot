// Handle All "clan" Commands
// # ---------------------- #

const { MessageActionRow, MessageButton } = require('discord.js');

const api = require('../../api');
const db = require('../../db');
const logic = require('../logic');

module.exports.sendClanCommand = async function(interaction, user) {
    // Keep usernames in database updated (silent)
    const clanMember = await db.clan.fetchMember(user.userid);
    if (clanMember && clanMember.tag !== `${interaction.user.username}#${interaction.user.discriminator}`) {
        clanMember.tag = `${interaction.user.username}#${interaction.user.discriminator}`;
        db.clan.setMemberTag(user.userid, clanMember.tag);
    }

    switch (interaction.options.getSubcommand()) {
        case 'profile':
            sendProfile(interaction, user, clanMember);
            break;
        case 'members':
            sendMembers(interaction, user, clanMember);
            break;
        case 'create':
            sendCreate(interaction, user, clanMember);
            break;
        case 'join':
            sendJoin(interaction, user, clanMember);
            break;
        case 'leave':
            sendLeave(interaction, user, clanMember);
            break;
        case 'rename':
            sendRename(interaction, user, clanMember);
            break;
        case 'promote':
            sendPromote(interaction, user, clanMember);
            break;
        case 'demote':
            sendDemote(interaction, user, clanMember);
            break;
        case 'kick':
            sendKick(interaction, user, clanMember);
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
async function sendPerks(interaction, user, clanMember) {
    if (!clanMember) { return interaction.reply('You are not currently in a clan! For more information, use `/help clan`.'); }
    // CLAN: PERKS
    // Step 1 - Fetch Variables
    const clan = await db.clan.fetchClan(clanMember.clan);
    const perks = logic.clan.getAllPerks(clan);
    console.log(perks);

    // Step 2 - Send Embed
    let embed = {
        color: logic.color.STATIC.clan,
        title: 'Clan Perks Summary',
        author: {
            name: clan.name
        },
        description: `${perks.fish_cd ? `**-${perks.fish_cd}%** fishing cooldown :alarm_clock:\n`: ''}\
${perks.coin_bonus ? `**+${perks.coin_bonus}%** coins from fishing :coin:\n` : ''}\
${perks.exp_bonus ? `**+${perks.exp_bonus}%** exp from fishing :star:\n` : ''}\
${perks.quest_cd ? `**-${perks.quest_cd}%** quest refresh cooldown :arrows_counterclockwise:\n` : ''}\
${perks.aquarium_capacity ? `**+${perks.aquarium_capacity}%** aquarium coin capacity :truck:\n` : ''}\
${perks.vote_bonus ? `**+${perks.vote_bonus}** quest point${perks.vote_bonus !== 1 ? 's' : ''} per vote :lollipop:\n` : ''}\
${perks.campaign_mba ? `**+${perks.campaign_mba}** clan points per campaign :shield:\n` : ''}\
${perks.quest_mba ? `**+${perks.quest_mba}%** quest rewards :scroll:\n` : ''}`
    };
    interaction.reply({ embeds: [embed] });
}

async function sendShop(interaction, user, clanMember) {
    if (!clanMember) { return interaction.reply('You are not currently in a clan! For more information, use `/help clan`.'); }
    // CLAN: SHOP
    // Step 1 - Fetch Variables
    const BUY_MAP = { 'fish_cd': 'cooldown', 'coin_bonus': 'coin', 'exp_bonus': 'exp', 'vote_bonus': 'vote', 'campaign_mba': 'campaign', 'quest_mba': 'quest' };
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

    // Step 2 - Send Embed
    let embed = {
        color: logic.color.STATIC.clan,
        title: 'Clan Shop',
        author: {
            name: clan.name
        },
        description: `**${clan.clan_points} Clan Point${clan.clan_points !== 1 ? 's' : ''}** :shield:`,
        fields: embedFields
    }
    interaction.reply({ embeds: [embed] });
}

async function sendProfile(interaction, user, clanMember) {
    if (!clanMember) { return interaction.reply('You are not currently in a clan! For more information, use `/help clan`.'); }
    // CLAN: PROFILE
    // Step 1 - Validate User Argument
    let USER_MENTIONED = false;
    const mentionedUser = interaction.options.getUser('user') || interaction.user;
    if (mentionedUser.id !== interaction.user.id) {
        if (mentionedUser.bot) {
            return interaction.reply(`**${mentionedUser.username}** is a bot and cannot have a Big Tuna account!`);
        }
        user = await db.users.fetchUser(mentionedUser.id);
        if (!user) {
            return interaction.reply(`**${mentionedUser.username}** has not used Big Tuna before!`);
        } else if (!user.opted_in) {
            return interaction.reply(`**${mentionedUser.username}** is not opted in! They must use the \`/optin\` command to make their clan status publicy visible.`);
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
        return interaction.reply({ embeds: [embed] });
    }
    const members = await db.clan.fetchMembers(clan.id);

    // Step 3 - Send Embed
    const memberString = members.map(member => {
        let asterisks = member.userid === mentionedUser.id ? '**' : '';
        const roleEmoji = ['', ':reminder_ribbon: ', ':crown: '][member.role];
        if (USER_MENTIONED && clan.id !== clanMember.clan && !member.opted_in) { member.tag = 'opted out'; asterisks = '*'; }
        else { member.tag = member.tag.replace('*', '\\*').replace('_', '\\_').replace('~', '\\~'); }
        return `${generateActivityMarker(member)} ${roleEmoji}${asterisks}${member.tag} (Lvl.${member.level})${asterisks}`;
    }).join('\n');

    const stars = logic.clan.getStarCount(clan.fish_caught);
    let embed = {
        color: logic.color.STATIC.clan,
        title: `Clan Overview${USER_MENTIONED ? ` - ${mentionedUser.username}` : ''}`,
        author: {
            name: clan.name
        },
        description: `:globe_with_meridians: Global Clan ID: ${clan.id}
${clan.password ? ':lock: Password-protected' : ':unlock: No Password'}
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
    interaction.reply({ embeds: [embed] });
}

async function sendMembers(interaction, user, clanMember) {
    if (!clanMember) { return interaction.reply('You are not currently in a clan! For more information, use `/help clan`.'); }
    // CLAN: MEMBERS
    // Step 1 - Fetch Data
    const clan = await db.clan.fetchClanByUserid(user.userid);
    const members = await db.clan.fetchMembers(clan.id);

    // Step 2 - Send Embed
    let increment = 0;
    const memberString = members.map(member => {
        increment++;
        let asterisks = member.userid === interaction.user.id ? '**' : '';
        const roleEmoji = ['', ':reminder_ribbon: ', ':crown: '][member.role];
        member.tag = member.tag.replace('*', '\\*').replace('_', '\\_').replace('~', '\\~').replace('`', '\\`');
        return `\`${increment}\` ${generateActivityMarker(member)} ${roleEmoji}${asterisks}${member.tag} (Lvl.${member.level}) | +${member.campaign_catches}${asterisks}`;
    }).join('\n');

    let embed = {
        color: logic.color.STATIC.clan,
        title: `Member Overview`,
        author: {
            name: clan.name
        },
        description: `Includes member ID (left) and campaign contributions (right).
\n**__Members__ (${members.length}/20)**
${memberString}`,
        footer: { 
            text: `Campaign cooldown resets in ${logic.text.millisToString(Math.ceil(Date.now()/86400000)*86400000 - Date.now())}`
        }
    }
    interaction.reply({ embeds: [embed] });
}

async function sendCreate(interaction, user, clanMember) {
    if (clanMember) { return interaction.reply('You are already in a clan!'); }
    // CLAN: CREATE
    // Step 1 - User Requirements/Validate Name
    if (user.level < 20) {
        return interaction.reply('You must be at least **Lvl. 20** to create your own clan!');
    } else if (user.coins < 5000) {
        return interaction.reply('You must have at least **5000 coins** to create your own clan!');
    }
    const clanName = interaction.options.getString('name');
    if (!isValidName(clanName)) {
        let embed = {
            color: logic.color.STATIC.failure,
            title: `"${clanName}" does not meet clan name requirements!`,
            description: `**Clan names may not...**
- exceed 32 characters
- include a double space
- include characters other than: \`!?#$%&():;1234567890qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM \``
        };
        return interaction.reply({ embeds: [embed] });
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
    interaction.reply({ embeds: [embed], components: [row] }).then(async () => {
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

async function sendJoin(interaction, user, clanMember) {
    if (clanMember) { return interaction.reply('You are already in a clan!'); }
    // CLAN: JOIN
    // Step 1 - Validate Clan Exists, Password Correct, Clan Not Full
    const clanId = interaction.options.getInteger('id');
    const clan = await db.clan.fetchClan(clanId);
    if (!clan) { return interaction.reply(`There is no clan with id **${clanId}**!`); }
    const password = interaction.options.getString('password');
    if (clan.password && password === null) { return interaction.reply('This clan requires a password to join!'); }
    if (clan.password && clan.password !== password) { return interaction.reply('Incorrect password!'); }
    const members = await db.clan.fetchMembers(clanId);
    if (members.length >= 20) { return interaction.reply('This clan is already full!'); }

    // Step 2 - Update Database
    await db.clan.createClanMember(user.userid, `${interaction.user.username}#${interaction.user.discriminator}`, clanId);

    // Step 3 - Send Embed
    let embed = {
        color: logic.color.STATIC.clan,
        title: `Joined Clan!`,
        description: `You joined the clan **${clan.name}**!
Check it out with \`/clan profile\`.`
    }
    interaction.reply({ embeds: [embed] });
}

async function sendLeave(interaction, user, clanMember) {
    if (!clanMember) { return interaction.reply('You are not in a clan!'); }
    // CLAN: LEAVE
    // Step 1 - Validate User Can Leave
    if (clanMember.role === 2) { return interaction.reply('Promote a player to Clan Leader before leaving your clan!'); }    
    // Step 2 - Send Confirmation Embed
    const clan = await db.clan.fetchClan(clanMember.clan);
    let embed = {
        color: logic.color.STATIC.default,
        title: `Leave Clan ${clan.name}?`
    };

    const row = new MessageActionRow().addComponents(
        new MessageButton().setCustomId(`${interaction.id} confirm`).setLabel('Confirm').setStyle('SUCCESS'),
        new MessageButton().setCustomId(`${interaction.id} cancel`).setLabel('Cancel').setStyle('DANGER')
    );
    interaction.reply({ embeds: [embed], components: [row] }).then(async () => {
        const filter = i => i.customId.split(' ')[0] === interaction.id;

        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 15000 });

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) { return i.reply({ content: 'That button is not for you!', ephemeral: true }); }
            collector.stop();

            const action = i.customId.split(' ')[1];
            let embed2;
            if (action === 'confirm') {
                embed2 = await handleLeaveConfirmButton(user, clanMember, clan.name);
            } else {
                embed2 = await handleLeaveCancelButton(clan.name);
            }
            await i.update({ embeds: [embed, embed2], components: [] });
        });

        collector.on('end', (collected, reason) => {
            if (reason === 'time') {
                interaction.editReply({ embeds: [embed], components: [] });
            }
        });
    });
}
async function handleLeaveConfirmButton(user, clanMember, clanName) {
    // Re-Validate User & Clan
    const newUser = await db.users.fetchUser(user.userid);
    const newClanMember = await db.clan.fetchMember(user.userid);
    if (clanMember.clan !== newClanMember.clan) {
        return {
            color: logic.color.STATIC.failure,
            title: 'Action Cancelled',
            description: 'You are no longer in this clan!'
        };
    }
    if (newClanMember.role === 2) {
        return {
            color: logic.color.STATIC.failure,
            title: 'Action Cancelled',
            description: 'You are now the Clan Leader!\nYou must promote another player to Clan Leader before leaving.'
        }
    }
    // Update Database
    await db.clan.removeMember(user.userid);
    // Return Embed
    return {
        color: logic.color.STATIC.success,
        title: 'Left Clan!',
        description: `You are no longer part of the clan **${clanName}**`
    };
}
async function handleLeaveCancelButton(clanName) {
    return {
        color: logic.color.STATIC.failure,
        title: 'Action Cancelled!',
        description: `You are still in the clan **${clanName}**.`
    };
}

async function sendRename(interaction, user, clanMember) {
    // CLAN: RENAME
    // Step 1 - Validate Action Valid
    if (!clanMember) { return interaction.reply('You are not currently in a clan! For more information, use `/help clan`.'); }
    if (clanMember.role === 0) { return interaction.reply('You must be a **Trusted Member** or the **Clan Leader** to rename a clan!'); }
    const clan = await db.clan.fetchClanByUserid(user.userid);
    if (clan.rename <= 0) { return interaction.reply('Your clan does not have any renames left! Purchase more with `/clan shop`!'); }

    const clanName = interaction.options.getString('name');
    if (!isValidName(clanName)) {
        let embed = {
            color: logic.color.STATIC.failure,
            title: `"${clanName}" does not meet clan name requirements!`,
            description: `**Clan names may not...**
- exceed 32 characters
- include a double space
- include characters other than: \`!?#$%&():;1234567890qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM \``
        };
        return interaction.reply({ embeds: [embed] });
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
    interaction.reply({ embeds: [embed], components: [row] }).then(async () => {
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

async function sendPromote(interaction, user, clanMember) {
    // CLAN: PROMOTE
    // Step 1 - Validate Action Valid
    if (!clanMember) { return interaction.reply('You are not currently in a clan! For more information, use `/help clan`.'); }
    if (clanMember.role === 0) { return interaction.reply('You must be a **Trusted Member** or the **Clan Leader** to promote clan members!'); }
    const memberId = interaction.options.getInteger('member');
    const members = await db.clan.fetchMembers(clanMember.clan);
    if (memberId <= 0 || memberId > members.length) {
        return interaction.reply(`**${memberId}** is not a valid member ID! See \`/clan members\` for a list of member IDs.`);
    }
    const member = await db.clan.fetchMemberByMemberId(clanMember.clan, memberId);
    if (member.userid === user.userid) { return interaction.reply('You cannot promote yourself!'); }
    if (clanMember.role <= member.role) {
        return interaction.reply('You cannot promote members with an equal or higher rank than you!!');
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
    interaction.reply({ embeds: [embed], components: [row] }).then(async () => {
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

async function sendDemote(interaction, user, clanMember) {
    // CLAN: DEMOTE
    // Step 1 - Validate Action Valid
    if (!clanMember) { return interaction.reply('You are not currently in a clan! For more information, use `/help clan`.'); }
    if (clanMember.role !== 2) { return interaction.reply('You must be the **Clan Leader** to demote clan members!'); }
    const memberId = interaction.options.getInteger('member');
    const members = await db.clan.fetchMembers(clanMember.clan);
    if (memberId <= 0 || memberId > members.length) {
        return interaction.reply(`**${memberId}** is not a valid member ID! See \`/clan members\` for a list of member IDs.`);
    }
    const member = await db.clan.fetchMemberByMemberId(clanMember.clan, memberId);
    if (member.userid === user.userid) { return interaction.reply('You cannot demote yourself!'); }
    if (member.role === 0) {
        return interaction.reply('You cannot demote members. See the `/kick` command.');
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
    interaction.reply({ embeds: [embed], components: [row] }).then(async () => {
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

async function sendKick(interaction, user, clanMember) {
    // CLAN: KICK
    // Step 1 - Validate Action Valid
    if (!clanMember) { return interaction.reply('You are not currently in a clan! For more information, use `/help clan`.'); }
    if (clanMember.role === 0) { return interaction.reply('You must be a **Trusted Member** or the **Clan Leader** to kick clan members!'); }
    const memberId = interaction.options.getInteger('member');
    const members = await db.clan.fetchMembers(clanMember.clan);
    if (memberId <= 0 || memberId > members.length) {
        return interaction.reply(`**${memberId}** is not a valid member ID! See \`/clan members\` for a list of member IDs.`);
    }
    const member = await db.clan.fetchMemberByMemberId(clanMember.clan, memberId);
    if (member.userid === user.userid) { return interaction.reply('You cannot kick yourself!'); }
    if (clanMember.role <= member.role) {
        return interaction.reply('You cannot kick members with an equal or higher rank than you!');
    }

    // Step 2 - Send Confirmation Embed
    let embed = {
        color: logic.color.STATIC.default,
        title: `Kick ${member.tag}?`
    };
    const row = new MessageActionRow().addComponents(
        new MessageButton().setCustomId(`${interaction.id} confirm`).setLabel('Confirm').setStyle('SUCCESS'),
        new MessageButton().setCustomId(`${interaction.id} cancel`).setLabel('Cancel').setStyle('DANGER')
    );
    interaction.reply({ embeds: [embed], components: [row] }).then(async () => {
        const filter = i => i.customId.split(' ')[0] === interaction.id;

        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 15000 });

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) { return i.reply({ content: 'That button is not for you!', ephemeral: true }); }
            collector.stop();

            const action = i.customId.split(' ')[1];
            let embed2;
            if (action === 'confirm') {
                embed2 = await handleKickConfirmButton(clanMember, member);
            } else {
                embed2 = await handleKickCancelButton(member.tag);
            }
            await i.update({ embeds: [embed, embed2], components: [] });
        });

        collector.on('end', (collected, reason) => {
            if (reason === 'time') {
                interaction.editReply({ embeds: [embed], components: [] });
            }
        });
    });
}
async function handleKickConfirmButton(clanMember, member) { // clanMember is author
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
    await db.users.setColumns(member.userid, { clan: 0 });
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
    if (!clanMember) { return interaction.reply('You are not currently in a clan! For more information, use `/help clan`.'); }
    // CLAN: PASSWORD - CHECK
    // Step 1 - Validate Permissions
    if (clanMember.role === 0) { return interaction.reply('You must be a Trusted Member or Clan Leader to view the clan password!'); }
    // Step 2 - Send Message
    const clan = await db.clan.fetchClan(clanMember.clan);
    interaction.reply({ content: clan.password ? `The join password for the clan ${clan.name} is **${clan.password}**` : `${clan.name} does not have a join password.`, ephemeral: true });
}

async function sendPasswordGenerate(interaction, clanMember) {
    if (!clanMember) { return interaction.reply('You are not currently in a clan! For more information, use `/help clan`.'); }
    // CLAN: PASSWORD - GENERATE
    // Step 1 - Validate Permissions
    if (clanMember.role === 0) { return interaction.reply('You must be a Trusted Member or Clan Leader to generate a new clan password!'); }
    // Step 2 - Update Database
    await db.clan.setPassword(clanMember.clan, generateClanPassword());
    // Step 3 - Send Message
    interaction.reply('A new join password was generated for your clan! Check it out with `/clan password check`.');
}

async function sendPasswordDisable(interaction, clanMember) {
    if (!clanMember) { return interaction.reply('You are not currently in a clan! For more information, use `/help clan`.'); }
    // CLAN: PASSWORD - DISABLE
    // Step 1 - Validate Permissions/Password Already Disabled
    if (clanMember.role === 0) { return interaction.reply('You must be a Trusted Member or Clan Leader to disable the clan password!'); }
    const clan = await db.clan.fetchClan(clanMember.clan);
    if (!clan.password) { return interaction.reply('Join passwords are already disabled for your clan!'); }
    // Step 2 - Update Database
    await db.clan.setPassword(clanMember.clan, null);
    // Step 3 - Send Message
    interaction.reply('Players can now join your clan without a password!');
}

async function sendCampaign(interaction, user, clanMember) {
    if (!clanMember) { return interaction.reply('You are not currently in a clan! For more information, use `/help clan`.'); }
    // CLAN: CAMPAIGN
    // Step 1 - Fetch Variables
    const clan = await db.clan.fetchClan(clanMember.clan);
    const CampaignData = api.campaign.getCampaignData(clan.campaign_stage);
    const bonusClanPoints = logic.clan.getBonusClanPoints(clan);
    const FishNames = api.fish.getFishNames();
    // Case: No more campaigns left
    if (!CampaignData) {
        let embed = {
            color: logic.color.STATIC.clan,
            title: `Campaign Stage ${clan.campaign_stage} - (Coming Soon)`,
            description: `Congratulations, your clan has completed all available stages!\n\nKeep an eye out for updates!`
        };
        return interaction.reply({ embeds: [embed] });
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
        const LocationData = api.fish.getLocationData(locationIds[i]);
        embedFields.push({
            name: `Location ${locationIds[i]} - ${LocationData.name}`,
            value: Object.entries(locations[locationIds[i]]).map(([key, value]) => {
                totalCaught += value.progress; totalRequired += value.required;
                return `${logic.text.capitalizeWords(key.replace(/_/g, ' '))} (${value.progress}/${value.required})`;
            }).join('\n'),
            inline: true
        });
        if (i%3 === 1) { embedFields.push({ name: '\u200b', value: '\u200b', inline: true }); }
    }

    // Step 3 - Send Embed
    const rewards = CampaignData.rewards; // alias
    const complete = totalCaught === totalRequired;
    let embed = {
        color: complete ? logic.color.STATIC.success : logic.color.STATIC.clan,
        title: `Campaign Stage ${clan.campaign_stage} - (\
${complete ? 'Complete!' : `${Math.round(totalCaught/totalRequired*100)}% Complete`})`, 
        author: {
            name: clan.name
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

    interaction.reply({ embeds: [embed], components: rowArr }).then(async () => {
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