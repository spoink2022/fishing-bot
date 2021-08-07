// IMPORTS
const api = require('../../api');
const db = require('../../db');

const { createEmbed } = require('../misc/embed.js');

// FUNCTIONS/CONSTANTS USED BY ALL COMMAND FILES
async function attemptReply(msg, str) {
    if (msg.channel.type === 'dm') { msg.channel.send(str); }
    else { msg.reply(str); }
}

module.exports.c = {
    'clan': [],
    'clanpassword': ['clanpass', 'cpassword', 'cpass'],
    'promote': [],
    'demote': []
};

module.exports.run = async function(msg, cmd, args, user) {
    if (cmd === 'clan') { showClan(msg); }
    else if (cmd === 'clanpassword') { showClanPassword(msg); }
    else if (cmd === 'promote') { sendPromote(msg, args); }
    else if (cmd === 'demote') { sendDemote(msg, args); }
}

// CLAN CONSTANTS
const ROLE_EMOJIS = ['', ':reminder_ribbon:',':crown:'];
const ROLE_NAMES = ['Member', 'Trusted Member', 'Leader'];
const STAR_VALUES = [100, 500, 2000, 10000, 50000];

// HELPER FUNCTIONS
function getStarCount(fishCaught) {
    for (let i=0; i<STAR_VALUES.length; i++) {
        if (STAR_VALUES[i] > fishCaught) {
            return i+1;
        }
    }
    return 6;
}

// EXECUTABLE FUNCTIONS
async function showClan(msg) {
    // ensure you are in a clan
    let clanMember = await db.clan.fetchMember(msg.author.id);
    if (!clanMember) { attemptReply(msg, 'You are not currently in a fishing clan!\nJoin one with `.join`'); return; }

    // get clan info
    let clan = await db.clan.fetchClan(clanMember.clan);
    let clanMembers = await db.clan.fetchMembers(clanMember.clan);
    let clanMemberLevels = await db.users.fetchLevels(clanMembers.map(member => member.userid));
    clanMemberLevels.sort((a, b) => a.level > b.level || (a.level === b.level && a.exp >= b.exp) ? -1 : 1);

    // post clan info
    let s = getStarCount(clan.fish_caught);
    let embedDescription = `**${clan.fish_caught}** Fish Caught :fish:\
    \n**${s}** Star${s === 1 ? '' : 's'} ${':star:'.repeat(s)}\
    \n\n__**Members**__ **(${clanMembers.length}/20)**\n`;

    let options = {
        author: [`${clan.name}`, null],
        title: 'Clan Overview',
        color: '#2acaea',
        description: embedDescription + clanMemberLevels.map(levelStats => {
            let clanMember = clanMembers.filter(member => member.userid === levelStats.userid)[0]; // filter returns a list
            let bold = clanMember.userid === msg.author.id ? '**' : '';
            const days = Math.floor((Date.now() - levelStats.cooldown) / 86400000); // days since last fished
            let activityMarker = days === 0 ? ':green_square:' : days < 7 ? ':yellow_square:' : ':red_square:';
            return `${ROLE_EMOJIS[clanMember.role]} ${bold}${clanMember.username} *(Lvl. ${levelStats.level})*${bold} ${activityMarker}`;
        }).join('\n')
    };
    let embed = await createEmbed(options);
    msg.channel.send(embed);
}

async function showClanPassword(msg) {
    // ensure you are in a clan
    let clanMember = await db.clan.fetchMember(msg.author.id);
    if (!clanMember) { attemptReply(msg, 'You are not currently in a fishing clan!\nJoin one with `.join`'); return; }
    let clan = await db.clan.fetchClan(clanMember.clan);

    // post information
    if (!clan.password) {
        msg.channel.send(`There is no join password for the clan **${clan.name}**`);
    } else if (clanMember.role === 0) {
        attemptReply(msg, 'You must be a trusted member or a clan leader to view your clan join password!');
    } else {
        msg.channel.send(`The join password for the clan **${clan.name}** is \`${clan.password}\``);
    }
}

async function sendPromote(msg, args) {
    // ensure you are in a clan
    let clanMember = await db.clan.fetchMember(msg.author.id);
    if (!clanMember) { attemptReply(msg, 'You are not currently in a fishing clan!\nJoin one with `.join`'); return; }

    // Find the member intended for promotion
    let mentionedUser = msg.mentions.members.first();
    if (mentionedUser) {
        var mentionedClanMember = await db.clan.fetchMember(mentionedUser.user.id);
    } else {
        if (!args[0]) {
            attemptReply(msg, 'You must specify the user you wish to promote!');
            return;
        }
        let username = args.join(' ');
        var mentionedClanMember = await db.clan.fetchMemberByUsername(username);
    }

    // Ensure that this clan member can be promoted
    if (!mentionedClanMember) { attemptReply(msg, 'That clan member does not exist!'); return; }

    if (clanMember.clan !== mentionedClanMember.clan) { // different clan
        attemptReply(msg, 'That clan member is in a different clan!'); return;
    }
    if (clanMember.userid === mentionedClanMember.userid) { // self-promote
        attemptReply(msg, 'You can\'t promote yourself!'); return;
    }
    if (clanMember.role <= mentionedClanMember.role) { // lacks rank
        attemptReply(msg, 'You cannot promote someone of the same or higher rank!'); return;
    }

    // Carry out the promotion
    if (mentionedClanMember.role === 0) {
        db.clan.setRole(mentionedClanMember.userid, 1);
        msg.channel.send(`${mentionedClanMember.username} was promoted to **Trusted Member**:reminder_ribbon:`);
    } else if (mentionedClanMember.role === 1) {
        let options = {
            title: `Promote this player to Leader?`,
            color: '#2acaea',
            description: `${mentionedClanMember.username} will be promoted to **Leader** :crown:\
            \nYou will be demoted to **Trusted Member**:reminder_ribbon:`
        };
        let embed = await createEmbed(options);
        msg.channel.send(embed).then(async(sentEmbed) => {
            await sentEmbed.react('✅');
            await sentEmbed.react('❌');
            const filter = ( reaction, user ) => (reaction.emoji.name === '✅' || reaction.emoji.name === '❌') && user.id === msg.author.id;
            const collector = await sentEmbed.createReactionCollector(filter, { time: 10000 });
            collector.on('collect', async (reactionData) => {
                if (reactionData.emoji.name === '✅') {
                    var options = {
                        title: 'Success!',
                        color: api.visuals.getColor('classic', 'success'),
                        description: `${mentionedClanMember.username} was promoted to **Leader** :crown:\
                        \nYou were demoted to **Trusted Member**:reminder_ribbon:`
                    }
                    db.clan.setRole(clanMember.userid, 1);
                    db.clan.setRole(mentionedClanMember.userid, 2);
                } else {
                    var options = {
                        title: 'Canceled!',
                        color: api.visuals.getColor('classic', 'failure'),
                        description: `${mentionedClanMember.username} was not promoted to **Leader** :crown:`
                    }
                }
                let embed = await createEmbed(options);
                sentEmbed.delete();
                msg.channel.send(embed);

            });
            collector.on('end', async(collected, reason) => {
                if (reason === 'time') {
                    let options = {
                        title: 'Timed Out!',
                        color: api.visuals.getColor('classic', 'failure'),
                        description: `${mentionedClanMember.username} was not promoted to **Leader** :crown:`
                    };
                    let embed = await createEmbed(options);
                    sentEmbed.delete();
                    msg.channel.send(embed);
                }
            });
        });
    }

}

async function sendDemote(msg, args) {
    // ensure you are in a clan
    let clanMember = await db.clan.fetchMember(msg.author.id);
    if (!clanMember) { attemptReply(msg, 'You are not currently in a fishing clan!\nJoin one with `.join`'); return; }

    // Find the member intended for demotion
    let mentionedUser = msg.mentions.members.first();
    if (mentionedUser) {
        var mentionedClanMember = await db.clan.fetchMember(mentionedUser.user.id);
    } else {
        if (!args[0]) {
            attemptReply(msg, 'You must specify the user you wish to demote!');
            return;
        }
        let username = args.join(' ');
        var mentionedClanMember = await db.clan.fetchMemberByUsername(username);
    }

    // Ensure that this clan member can be demoted
    if (!mentionedClanMember) { attemptReply(msg, 'That clan member does not exist!'); return; }

    if (clanMember.clan !== mentionedClanMember.clan) { // different clan
        attemptReply(msg, 'That clan member is in a different clan!'); return;
    }
    if (clanMember.userid === mentionedClanMember.userid) { // self-demote
        attemptReply(msg, 'You can\'t demote yourself!'); return;
    }
    if (clanMember.role <= mentionedClanMember.role) { // lacks rank
        attemptReply(msg, 'You cannot demote someone of the same or higher rank!'); return;
    }
    // Carry out the demotion
    if (mentionedClanMember.role === 1) { //demote Trusted Member
        db.clan.setRole(mentionedClanMember.userid, 0);
        msg.channel.send(`${mentionedClanMember.username} was demoted to **Member**`);
    } else { // kick Member
        let options = {
            title: `Kick this player from your clan?`,
            color: '#2acaea',
            description: `${mentionedClanMember.username} will be kicked from the clan :boot:`
        };
        let embed = await createEmbed(options);
        msg.channel.send(embed).then(async(sentEmbed) => {
            await sentEmbed.react('✅');
            await sentEmbed.react('❌');
            const filter = ( reaction, user ) => (reaction.emoji.name === '✅' || reaction.emoji.name === '❌') && user.id === msg.author.id;
            const collector = await sentEmbed.createReactionCollector(filter, { time: 10000 });
            collector.on('collect', async (reactionData) => {
                if (reactionData.emoji.name === '✅') {
                    var options = {
                        title: 'Success!',
                        color: api.visuals.getColor('classic', 'success'),
                        description: `${mentionedClanMember.username} was kicked from the clan :boot:`
                    }
                    db.clan.kickMember(mentionedClanMember.userid);
                } else {
                    var options = {
                        title: 'Canceled!',
                        color: api.visuals.getColor('classic', 'failure'),
                        description: `${mentionedClanMember.username} was not kicked from the clan :no_entry_sign:`
                    }
                }
                let embed = await createEmbed(options);
                sentEmbed.delete();
                msg.channel.send(embed);

            });
            collector.on('end', async(collected, reason) => {
                if (reason === 'time') {
                    let options = {
                        title: 'Timed Out!',
                        color: api.visuals.getColor('classic', 'failure'),
                        description: `${mentionedClanMember.username} was not kicked from the clan :no_entry_sign:`
                    };
                    let embed = await createEmbed(options);
                    sentEmbed.delete();
                    msg.channel.send(embed);
                }
            });
        });
    }
}