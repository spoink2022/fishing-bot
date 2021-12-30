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
            sendProfile(interaction, user);
            break;
        case 'members':
            sendMembers(interaction, user);
            break;
        case 'create':
            sendCreate(interaction, user);
            break;
        case 'rename':
            sendRename(interaction, user, clanMember);
            break;
        case 'promote':
            sendPromote(interaction, user, clanMember);
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

// "Exports"
async function sendProfile(interaction, user) {
    if (user.clan === 0) { return interaction.reply('You are not currently in a clan! For more information, use `/help clan`.'); }
    // CLAN: PROFILE
    // Step 1 - Validate User Argument
    const authorClan = user.clan;
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
    const clan = await db.clan.fetchClan(user.clan);
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
        if (USER_MENTIONED && clan.id !== authorClan && !member.opted_in) { member.tag = 'opted out'; asterisks = '*'; }
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

async function sendMembers(interaction, user) {
    if (user.clan === 0) { return interaction.reply('You are not currently in a clan! For more information, use `/help clan`.'); }
    // CLAN: MEMBERS
    // Step 1 - Fetch Data
    const clan = await db.clan.fetchClan(user.clan);
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

async function sendCreate(interaction, user) {
    if (user.clan !== 0) { return interaction.reply('You are already in a clan!'); }
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
    user = await db.users.fetchUser(user.userid);
    if (user.clan !== 0) {
        return {
            color: logic.color.STATIC.failure,
            title: 'Action Cancelled',
            description: 'You are already in a clan!'
        };
    }
    
    if (user.coins < 5000) {
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
    await db.users.setColumns(user.userid, { clan: clanId });
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

async function sendRename(interaction, user, clanMember) {
    // CLAN: CREATE
    // Step 1 - Validate Action Valid
    if (user.clan === 0) { return interaction.reply('You are not currently in a clan! For more information, use `/help clan`.'); }
    if (clanMember.role === 0) { return interaction.reply('You must be a **Trusted Member** or the **Clan Leader** to rename a clan!'); }
    const clan = await db.clan.fetchClan(user.clan);
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
                embed2 = await handleRenameConfirmButton(user, clanName);
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
async function handleRenameConfirmButton(user, clanName) {
    // Re-Validate User & Clan (no need to validate member role since it doesn't really break anything)
    const newUser = await db.users.fetchUser(user.userid);
    if (newUser.clan !== user.clan) {
        return {
            color: logic.color.STATIC.failure,
            title: 'Action Cancelled',
            description: 'You are no longer in this clan!'
        };
    }
    const clan = await db.clan.fetchClan(user.clan);
    if (!clan || clan.rename <= 0) {
        return {
            color: logic.color.STATIC.failure,
            title: 'Action Cancelled',
            description: 'Your clan does not have any renames left.'
        }
    }
    // Update Database
    await db.clan.setClanName(user.clan, clanName, paid=true);
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
        title: 'Cancelled!',
        description: 'Clan was not renamed.'
    };
}

async function sendPromote(interaction, user, clanMember) {
    // CLAN: PROMOTE
    // Step 1 - Validate Action Valid
    if (user.clan === 0) { return interaction.reply('You are not currently in a clan! For more information, use `/help clan`.'); }
    if (clanMember.role === 0) { return interaction.reply('You must be a **Trusted Member** or the **Clan Leader** to promote clan members!'); }
    const memberId = interaction.options.getInteger('member');
    const members = await db.clan.fetchMembers(user.clan);
    if (memberId <= 0 || memberId > members.length) {
        return interaction.reply(`**${memberId}** is not a valid member ID! See \`/clan members\` for a list of member IDs.`);
    }
    const member = await db.clan.fetchMemberByMemberId(user.clan, memberId);
    if (member.userid === user.userid) { return interaction.reply('You cannot promote yourself!'); }
    if (clanMember.role <= member.role) {
        return interaction.reply('You cannot promote members with equal or higher ranks!');
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
    if (newMember.clan !== clanMember.clan) { // target not in clan anymore
        return {
            color: logic.color.STATIC.failure,
            title: 'Action Cancelled',
            description: `**${member.tag}** is no longer in your clan!`
        };
    }
    if (newClanMember.clan !== clanMember.clan) { // self not in clan anymore
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