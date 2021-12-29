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
        case 'create':
            sendCreate(interaction, user, clanMember);
            break;
        default:
            break;
    }
}

async function sendProfile(interaction, user, clanMember) {
    if (!clanMember) { return interaction.reply('You are not currently in a clan! For more information, use `/help clan`.'); }
    // CLAN: PROFILE
    // Step 1 - Fetch Data


    interaction.reply('profile');
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
    const clanMember = await db.clan.fetchMember(user.userid);
    if (clanMember) {
        return {
            color: logic.color.STATIC.failure,
            title: 'Action Cancelled',
            description: 'You are already in a clan!'
        };
    }

    user = await db.users.fetchUser(user.userid);
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

function isValidName(name) {
    const VALID_CHARACTERS = [...'!?#$%&():;1234567890qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM '];
    const validCharactersOnly = ![...name].some(char => !VALID_CHARACTERS.includes(char));
    return name.length <= 32 && !name.includes('  ') && validCharactersOnly;
}