// IMPORTS
const { User } = require('discord.js');
const api = require('../../api');
const db = require('../../db');

const { createEmbed } = require('../misc/embed.js');
const { getStarCount, getClanPerks } = require('../misc/game_logic.js');
const { capitalizeWords, numToRank } = require('../misc/str_functions.js');

const NumWordMapList = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];

// FUNCTIONS/CONSTANTS USED BY ALL COMMAND FILES
async function attemptReply(msg, str) {
    if (msg.channel.type === 'dm') { msg.channel.send(str); }
    else { msg.reply(str); }
}

module.exports.c = {
    'clan': [],
    'members': [],
    'clanshop': ['cs'],
    'clanperks': ['cp', 'clanperk'],
    'create': ['createclan'],
    'rename': ['renameclan'],
    'join': ['joinclan'],
    'leave': ['leaveclan'],
    'password': ['clanpass', 'cpassword', 'cpass', 'clanpassword', 'pass'],
    'newpassword': ['newpass'],
    'nopassword': ['nopass'],
    'promote': [],
    'demote': [],
    'kick': [],
    'campaign': ['ca']
};

module.exports.run = async function(msg, cmd, args, user) {
    if (cmd === 'clan') { sendClan(msg); } // .clan checks for username change
    else if (cmd === 'members') { sendMembers(msg); } // .members checks for username change
    else if (cmd === 'clanshop') { sendClanShop(msg); }
    else if (cmd === 'clanperks') { sendClanPerks(msg); }
    else if (cmd === 'create') { sendCreate(msg, user); }
    else if (cmd === 'rename') { sendRename(msg, args); }
    else if (cmd === 'join') { sendJoin(msg, args); }
    else if (cmd === 'leave') { sendLeave(msg); }
    else if (cmd === 'password') { sendPassword(msg); }
    else if (cmd === 'newpassword') { sendNewPassword(msg); }
    else if (cmd === 'nopassword') { sendNoPassword(msg); }
    else if (cmd === 'promote') { sendPromote(msg, args); }
    else if (cmd === 'demote') { sendDemote(msg, args); }
    else if (cmd === 'kick') { sendDemote(msg, args, kick=true); }
    else if (cmd === 'campaign') { sendCampaign(msg); }
}

// CLAN CONSTANTS
const ROLE_EMOJIS = ['', ':reminder_ribbon:',':crown:'];
const ROLE_NAMES = ['Member', 'Trusted Member', 'Leader'];
const CREATE_REQUIREMENTS = { LEVEL: 20, PRICE: 5000 };

const ALPHABET = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l',
'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x',  'y', 'z'];

const CLAN_NAME_CHARACTERS = [...'1234567890qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM '];

// HELPER FUNCTIONS
function generatePassword() {
    let pass = '';
    for (let i=0; i<6; i++) {
        pass += ALPHABET[Math.floor(Math.random() * 26)];
    }
    return pass;
}

// EXECUTABLE FUNCTIONS
async function sendClan(msg) {
    // ensure you are in a clan
    let clanMember = await db.clan.fetchMember(msg.author.id);
    if (!clanMember) { attemptReply(msg, 'You are not currently in a fishing clan!\nJoin one with `.join`'); return; }

    // username check (silent action)
    let expectedUsername = msg.author.username + '#' + msg.author.discriminator;
    if (clanMember.username !== expectedUsername) {
        await db.clan.setUsername(msg.author.id, expectedUsername);
    }

    // get clan info
    let clan = await db.clan.fetchClan(clanMember.clan);
    let clanMembers = await db.clan.fetchMembers(clanMember.clan);
    let clanMemberLevels = await db.users.fetchLevels(clanMembers.map(member => member.userid));
    clanMemberLevels.sort((a, b) => a.level > b.level || (a.level === b.level && a.exp >= b.exp) ? -1 : 1);

    // post clan info
    let s = getStarCount(clan.fish_caught);
    let embedDescription = `Clan ID: **${clan.id}**\
    \n${clan.password === null ? 'No Password :unlock:' : 'Password Protected :lock:'}\
    \n**${clan.clan_points}** Clan Point${clan.clan_points == 1 ? '' : 's'} :shield:\
    \n**${clan.fish_caught}** Fish Caught :fish:\
    \n**${s}** Star${s === 1 ? '' : 's'} ${':star:'.repeat(s)}\
    \n**${numToRank(clan.campaign_stage)}** Campaign Stage :golf:\
    \n**${clan.rename}** Rename${clan.rename === 1 ? '' : 's'} :placard:\
    \n\n__**Members**__ **(${clanMembers.length}/20)**\n`;

    let options = {
        author: [`${clan.name}`, null],
        title: 'Clan Overview',
        color: '#2acaea',
        description: embedDescription + clanMemberLevels.map(levelStats => {
            let clanMember = clanMembers.filter(member => member.userid === levelStats.userid)[0]; // filter returns a list
            let bold = clanMember.userid === msg.author.id ? '**' : '';
            const days = Math.floor((Date.now() - levelStats.cooldown) / 86400000); // days since last fished
            let activityMarker = days < 7 ? ':green_square:' : days < 14 ? ':yellow_square:' : ':red_square:';
            return `${activityMarker} ${ROLE_EMOJIS[clanMember.role]} ${bold}${clanMember.username} (Lvl. ${levelStats.level})${bold}`;
        }).join('\n')
    };
    let embed = await createEmbed(options);
    msg.channel.send(embed);
}

async function sendMembers(msg) {
    // ensure you are in a clan
    let clanMember = await db.clan.fetchMember(msg.author.id);
    if (!clanMember) { attemptReply(msg, 'You are not currently in a fishing clan!\nJoin one with `.join`'); return; }

    // username check (silent action)
    let expectedUsername = msg.author.username + '#' + msg.author.discriminator;
    if (clanMember.username !== expectedUsername) {
        await db.clan.setUsername(msg.author.id, expectedUsername);
    }

    // get clan info
    let clan = await db.clan.fetchClan(clanMember.clan);
    let clanMembers = await db.clan.fetchMembers(clanMember.clan);
    let clanMemberLevels = await db.users.fetchLevels(clanMembers.map(member => member.userid));
    clanMemberLevels.sort((a, b) => a.level > b.level || (a.level === b.level && a.exp >= b.exp) ? -1 : 1);

    // construct embed
    let options = {
        author: [clan.name, null],
        title: 'Member Overview',
        color: '#2acaea',
        description: `Includes campaign contribution.\
\n\n__**Members**__ **(${clanMembers.length}/20)**\n` + clanMemberLevels.map(levelStats => {
            let clanMember = clanMembers.filter(member => member.userid === levelStats.userid)[0]; // filter returns a list
            let bold = clanMember.userid === msg.author.id ? '**' : '';
            const days = Math.floor((Date.now() - levelStats.cooldown) / 86400000); // days since last fished
            let activityMarker = days < 7 ? ':green_square:' : days < 14 ? ':yellow_square:' : ':red_square:';
            return `${activityMarker} ${ROLE_EMOJIS[clanMember.role]} ${bold}${clanMember.username} (Lvl. ${levelStats.level}) | +${clanMember.campaign_catches}${bold}`;
        }).join('\n')
    };
    let embed = await createEmbed(options);
    msg.channel.send(embed);
}

async function sendClanShop(msg) {
    // ensure you are in a clan
    let clanMember = await db.clan.fetchMember(msg.author.id);
    if (!clanMember) { attemptReply(msg, 'You are not currently in a fishing clan!\nJoin one with `.join`'); return; }

    let clan = await db.clan.fetchClan(clanMember.clan);
    const shopData = api.gamedata.getAllClanShopData();

    let embedFields = [], reactEmojis = [];
    for (const [dbCategory, data] of Object.entries(shopData.perks)) {
        let nextLevel = data.levels[clan[dbCategory]];
        if (!nextLevel) { // MAXED
            continue;
        }
        let affordable = clan.clan_points >= nextLevel.price;
        if (affordable) { reactEmojis.push(data.emoji); }

        let oldPerk = data.levels[clan[dbCategory] - 1] || {value: 0};
        let fieldValue = `(${nextLevel.price}) ` + data.desc.replace('{OLD}', oldPerk.value).replace('{NEW}', nextLevel.value);

        embedFields.push({
            name: `${affordable ? data.emoji : ':credit_card:'}   ${data.shopName} Lvl. ${clan[dbCategory]+1}`,
            value: fieldValue
        });
    }
    for (const [dbCategory, data] of Object.entries(shopData.items)) {
        let affordable = clan.clan_points >= data.price;
        if (affordable) { reactEmojis.push(data.emoji); }

        embedFields.push({
            name: `${affordable ? data.emoji : ':credit_card:'}   ${data.shopName}`,
            value: `(${data.price}) ${data.desc}`
        });
    }

    let options = {
        author: [clan.name, null],
        color: '#2acaea',
        title: 'Clan Shop',
        description: `**${clan.clan_points} Clan Points** :shield:\n\u200b`,
        fields: embedFields
    };
    let embed = await createEmbed(options);
    msg.channel.send(embed).then(async (sentEmbed) => {
        for (let emoji of reactEmojis) {
            sentEmbed.react(emoji);
        }
        const filter = ( reaction, user ) => reactEmojis.includes(reaction.emoji.name) && user.id === msg.author.id;
        const collector = sentEmbed.createReactionCollector(filter, { time: 20000 });
        collector.on('collect', async (reactionData) => {
            collector.stop();
            let perkInfo = Object.entries(shopData.perks).filter(tuple => tuple[1].emoji === reactionData.emoji.name)[0];
            let isUpgrade = true;
            if (!perkInfo) {
                perkInfo = Object.entries(shopData.items).filter(tuple => tuple[1].emoji === reactionData.emoji.name)[0];
                isUpgrade = false;
            }
            let dbColumn = perkInfo[0];
            if (isUpgrade) {
                let shopName = perkInfo[1].shopName;
                perkInfo = [perkInfo[0], perkInfo[1].levels[clan[dbColumn]]];
                perkInfo[1].shopName = shopName;
            }
            let price = perkInfo[1].price;
            
            let refreshedClan = await db.clan.fetchClan(clan.id);
            // check for already having that upgrade
            if (isUpgrade && clan[dbColumn] !== refreshedClan[dbColumn]) {
                attemptReply(msg, 'Your clan has already purchased that upgrade!');
                return;
            }
            // renewed check for affordability
            if (refreshedClan.clan_points < price) {
                attemptReply(msg, 'Your clan can no longer afford this purchase!');
                return;
            }
            await db.clan.updateColumn(clan.id, 'clan_points', -price);
            await db.clan.updateColumn(clan.id, dbColumn, 1);
            let options = {
                author: [clan.name, null],
                color: '#2acaea',
                title: `Purchased ${perkInfo[1].shopName} ${isUpgrade ? `Lvl. ${clan[dbColumn]+1}` : 'x1'}!`
            };
            let embed = await createEmbed(options);
            msg.channel.send(embed);
        });
        collector.on('end', async() => {
            sentEmbed.reactions.removeAll().catch(() => {
                console.log('Couldn\'t remove CLAN SHOP reactions');
            });
        });
    });
}

async function sendClanPerks(msg) {
    // ensure you are in a clan
    let clanMember = await db.clan.fetchMember(msg.author.id);
    if (!clanMember) { attemptReply(msg, 'You are not currently in a fishing clan!\nJoin one with `.join`'); return; }

    // get clan info
    let clan = await db.clan.fetchClan(clanMember.clan);
    let perks = getClanPerks(clan);
    
    let embedDescription = `${perks.fish_cd ? `\n**-${perks.fish_cd}%** fishing cooldown :timer:` : ''}\
${perks.coin_bonus ? `\n**+${perks.coin_bonus}%** coins from fishing :coin:`: ''}\
${perks.exp_bonus ? `\n**+${perks.exp_bonus}%** exp from fishing :star:` : ''}\
${perks.quest_cd ? `\n**-${perks.quest_cd}%** quest refresh cooldown :arrows_counterclockwise:` : ''}\
${perks.quest_mba ? `\n**+${perks.quest_mba}%** quest rewards :scroll:` : ''}\
${perks.vote_bonus ? `\n**+${perks.vote_bonus}** quest point${perks.vote_bonus === 1 ? '' : 's'} per vote :lollipop:` : ''}\
${perks.campaign_mba ? `\n**+${perks.campaign_mba}** clan points from campaigns :shield:` : ''}\
${perks.aquarium_capacity ? `\n**+${perks.aquarium_capacity}%** aquarium coin capacity :truck:` : ''}\
${perks.max_weight ? `\n**+${perks.max_weight}%** max weight :brick:` : ''}`;

    let options = {
        author: [clan.name, null],
        color: '#2acaea',
        title: 'Clan Perks Summary',
        description: embedDescription
    };
    let embed = await createEmbed(options);
    msg.channel.send(embed);
}

async function sendCreate(msg, user) {
    // ensure you are not in a clan
    let clanMember = await db.clan.fetchMember(msg.author.id);
    if (clanMember) { attemptReply(msg, 'You are already in a fishing clan!\nTo join another clan, first leave your old clan with `.leave`'); return; }
    // check for level, coins
    if (user.level < CREATE_REQUIREMENTS.LEVEL) { attemptReply(msg, `You must be **Lvl. ${CREATE_REQUIREMENTS.LEVEL}** in order to create a clan!`); return; }
    if (user.coins < CREATE_REQUIREMENTS.PRICE) { attemptReply(msg, `You must have **${CREATE_REQUIREMENTS.PRICE} coins** in order to create a clan!`); return; }
    // check for confirmation
    let options = {
        title: 'Create a New Clan?',
        color: '#2acaea',
        description: `This will cost **${CREATE_REQUIREMENTS.PRICE} coins**\n\n\
(You will be able to customize your clan after creating it)`
    };
    let embed = await createEmbed(options);
    msg.channel.send(embed).then(async (sentEmbed) => {
        await sentEmbed.react('✅');
        await sentEmbed.react('❌');
        const filter = ( reaction, user ) => (reaction.emoji.name === '✅' || reaction.emoji.name === '❌') && user.id === msg.author.id;
        const collector = await sentEmbed.createReactionCollector(filter, { time: 10000 });
        collector.on('collect', async (reactionData) => {
            collector.stop();
            if (reactionData.emoji.name === '✅') {
                // EDGE CASE: DOUBLE REACT check for already being in a clan
                clanMember = await db.clan.fetchMember(msg.author.id);
                if (clanMember) {
                    collector.stop();
                    sentEmbed.delete();
                    attemptReply(msg, 'You are already in a clan!');
                    return;
                }
                var options = {
                    title: 'Success!',
                    color: api.visuals.getColor('classic', 'success'),
                    description: 'Check out your newly created clan with `.clan`!'
                }
                // create the clan
                db.users.updateColumn(msg.author.id, 'coins', -CREATE_REQUIREMENTS.PRICE);
                db.clan.createClan(msg.author.id, msg.author.username + '#' + msg.author.discriminator);
            } else {
                var options = {
                    title: 'Canceled!',
                    color: api.visuals.getColor('classic', 'failure')
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
                    color: api.visuals.getColor('classic', 'failure')
                };
                let embed = await createEmbed(options);
                sentEmbed.delete();
                msg.channel.send(embed);
            }
        });
    });
}

async function sendRename(msg, args) {
    // ensure you are in a clan
    let clanMember = await db.clan.fetchMember(msg.author.id);
    if (!clanMember) { attemptReply(msg, 'You are not currently in a fishing clan!\nFor more information type `.help clan`'); return; }
    // role check
    if (clanMember.role === 0) { attemptReply(msg, 'You must be a **Trusted Member** or the **Leader** to change your clan name!'); return; }
    // renames left?
    let clan = await db.clan.fetchClan(clanMember.clan);
    if (clan.rename === 0) { attemptReply(msg, 'Your clan has no renames left!'); return; }

    // NAME REQUIREMENTS
    // 32 characters max, no double-spaces
    let chosenName = msg.content.substr(msg.content.indexOf(' ') + 1);
    // case: empty parameter
    if (!chosenName) { attemptReply(msg, 'You must include what you want to rename your clan to!'); return; }
    // case: >32 characters
    if (chosenName.length > 32) { attemptReply(msg, 'Your clan name may not have more than 32 characters!'); return; }
    // case: incorrect space rules
    if (chosenName.includes('  ') || chosenName[0] === ' ' || chosenName[-1] === ' ') {
        attemptReply(msg, 'Your clan name may not have double spaces and may not start or end with a space!');
        return;
    }
    // case: invalid letters
    if ([...chosenName].some(char => !CLAN_NAME_CHARACTERS.includes(char))) {
        attemptReply(msg, `You may only use certain characters in clan names: \`${CLAN_NAME_CHARACTERS.join('')}\``);
        return;
    }

    // Valid Name: Acquire Confirmation
    let options = {
        title: `Rename your clan?`,
        color: '#2acaea',
        description: `Renaming from **${clan.name}** to **${chosenName}**`
    };
    let embed = await createEmbed(options);
    msg.channel.send(embed).then(async (sentEmbed) => {
        await sentEmbed.react('✅');
        await sentEmbed.react('❌');
        const filter = ( reaction, user ) => (reaction.emoji.name === '✅' || reaction.emoji.name === '❌') && user.id === msg.author.id;
        const collector = await sentEmbed.createReactionCollector(filter, { time: 10000 });
        collector.on('collect', async (reactionData) => {
            if (reactionData.emoji.name === '✅') {
                // EDGE CASE: DOUBLE REACT check for no more renames
                clan = await db.clan.fetchClan(clanMember.clan);
                if (!clan || clan.rename === 0) {
                    collector.stop();
                    sentEmbed.delete();
                    attemptReply(msg, 'You do not have any clan renames left!');
                    return;
                }
                var options = {
                    title: 'Success!',
                    color: api.visuals.getColor('classic', 'success'),
                    description: `Your clan has been renamed to **${chosenName}**!`
                }
                db.clan.renameClan(clan.id, chosenName);
            } else {
                var options = {
                    title: 'Canceled!',
                    color: api.visuals.getColor('classic', 'failure')
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
                    color: api.visuals.getColor('classic', 'failure')
                };
                let embed = await createEmbed(options);
                sentEmbed.delete();
                msg.channel.send(embed);
            }
        });
    });
}

async function sendJoin(msg, args) {
    // ensure you are not in a clan
    let clanMember = await db.clan.fetchMember(msg.author.id);
    if (clanMember) { attemptReply(msg, 'You are already in a fishing clan!\nTo join another clan, first leave your old clan with `.leave`'); return; }
    // acquire clan information
    if (isNaN(parseInt(args[0])) || isNaN(args[0]) || args[0].includes('.')) { attemptReply(msg, 'Please provide a **number** for the ID of the clan you would like to join!'); return; }
    if (!args[0]) { attemptReply(msg, 'You must specify the ID of the clan you wish to join!'); return; }
    
    let clan = await db.clan.fetchClan(args[0]);
    if (!clan) { attemptReply(msg, `There is no clan with Clan ID \`${args[0]}\``); return; }

    // password check
    if (clan.password) {
        if (!args[1]) { attemptReply(msg, 'You must provide a password in addition to the Clan ID to join this clan!'); return; }
        if (clan.password !== args[1]) { attemptReply(msg, '**Incorrect Password!**'); return; }
    }
    // member cap check
    let memberCount = (await db.clan.fetchMembers(clan.id)).length;
    if (memberCount >= 20) { attemptReply(msg, 'This clan already has 20 members!'); return; }
    // add to clan, send message
    db.clan.joinMember(msg.author.id, msg.author.username + '#' + msg.author.discriminator, clan.id);
    attemptReply(msg, `Congratulations! You joined the clan **${clan.name}**!`);
}

async function sendLeave(msg) {
    // ensure you are in a clan
    let clanMember = await db.clan.fetchMember(msg.author.id);
    if (!clanMember) { attemptReply(msg, 'You are not currently in a fishing clan!\nJoin one with `.join`'); return; }
    
    // act
    let clan = await db.clan.fetchClan(clanMember.clan);
    if (clanMember.role !== 2) {
        db.clan.kickMember(msg.author.id); // self-kick
        attemptReply(msg, `Success! You left the clan **${clan.name}**!`);
    } else {
        let clanMemberCount = (await db.clan.fetchMembers(clanMember.clan)).length;
        if (clanMemberCount === 1) { // SPECIAL CASE: last member (delete clan)
            let options = {
                title: 'Leave your clan?',
                color: '#2acaea',
                description: 'The clan will be deleted if you leave!'
            };
            let embed = await createEmbed(options);
            msg.channel.send(embed).then(async (sentEmbed) => {
                await sentEmbed.react('✅');
                await sentEmbed.react('❌');
                const filter = ( reaction, user ) => (reaction.emoji.name === '✅' || reaction.emoji.name === '❌') && user.id === msg.author.id;
                const collector = await sentEmbed.createReactionCollector(filter, { time: 10000 });
                collector.on('collect', async (reactionData) => {
                    if (reactionData.emoji.name === '✅') {
                        // EDGE CASE: DOUBLE REACT check for already being not in a clan
                        clanMember = await db.clan.fetchMember(msg.author.id);
                        if (!clanMember) {
                            collector.stop();
                            sentEmbed.delete();
                            attemptReply(msg, 'You have already left your clan!');
                            return;
                        }
                        var options = {
                            title: 'Success!',
                            color: api.visuals.getColor('classic', 'success'),
                            description: `Success! You left the clan **${clan.name}**!\nThe clan has been deleted.`
                        }
                        db.clan.kickMember(msg.author.id); // self-kick
                        db.clan.deleteClan(clanMember.clan);
                    } else {
                        var options = {
                            title: 'Canceled!',
                            color: api.visuals.getColor('classic', 'failure')
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
                            color: api.visuals.getColor('classic', 'failure')
                        };
                        let embed = await createEmbed(options);
                        sentEmbed.delete();
                        msg.channel.send(embed);
                    }
                });
            });
        } else {
            attemptReply(msg, 'Please promote someone else to leader before leaving your clan!');
        }
    }
}

async function sendPassword(msg) {
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

async function sendNewPassword(msg) {
    // ensure you are in a clan
    let clanMember = await db.clan.fetchMember(msg.author.id);
    if (!clanMember) { attemptReply(msg, 'You are not currently in a fishing clan!\nJoin one with `.join`'); return; }
    // ensure roles
    if (clanMember.role === 0) { attemptReply(msg, 'Only Leaders and Trusted Members can change the clan password!'); return; }
    // make the changes + post information
    const newPassword = generatePassword();
    db.clan.setPassword(clanMember.clan, newPassword);
    attemptReply(msg, 'A new password has been generated for your clan!\nView it with `.password`');
}

async function sendNoPassword(msg) {
    // ensure you are in a clan
    let clanMember = await db.clan.fetchMember(msg.author.id);
    if (!clanMember) { attemptReply(msg, 'You are not currently in a fishing clan!\nJoin one with `.join`'); return; }
    // ensure roles, check that password exists
    if (clanMember.role === 0) { attemptReply(msg, 'Only Leaders and Trusted Members can disable clan passwords!'); return; }
    let clan = await db.clan.fetchClan(clanMember.clan);
    if (!clan.password) { attemptReply(msg, `Your clan **${clan.name}** already does not require a password to join!`); return; }
    // make the changes, post information
    db.clan.setPassword(clanMember.clan, null);
    attemptReply(msg, `Players can now join the clan **${clan.name}** without a password!\nTo go back to requiring a password, use \`.newpassword\``);
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
        let username = msg.content.substr(msg.content.indexOf(' ') + 1);
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

async function sendDemote(msg, args, kick=false) {
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
        var username = msg.content.substr(msg.content.indexOf(' ') + 1);
        var mentionedClanMember = await db.clan.fetchMemberByUsername(username);
    }

    // Ensure that this clan member can be demoted
    if (!mentionedClanMember) { attemptReply(msg, 'That clan member does not exist!'); return; }

    if (clanMember.clan !== mentionedClanMember.clan) { // different clan
        attemptReply(msg, 'That clan member is in a different clan!'); return;
    }
    if (clanMember.userid === mentionedClanMember.userid) { // self-demote
        attemptReply(msg, `You can\'t ${kick ? 'kick' : 'demote'} yourself!`); return;
    }
    if (clanMember.role <= mentionedClanMember.role) { // lacks rank
        attemptReply(msg, `You cannot ${kick ? 'kick' : 'demote'} someone of the same or higher rank!`); return;
    }
    // Carry out the demotion
    if (mentionedClanMember.role === 1 && !kick) { //demote Trusted Member
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
                    // EDGE CASE: DOUBLE REACT already kicked user
                    proxyMentionedClanMember = mentionedUser ? await db.clan.fetchMember(mentionedUser.user.id) : await db.clan.fetchMemberByUsername(username);
                    if (!proxyMentionedClanMember) {
                        collector.stop();
                        sentEmbed.delete();
                        attemptReply(msg, 'That clan member has already been kicked!');
                        return;
                    }
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

async function sendCampaign(msg) {
    // ensure you are in a clan
    let clanMember = await db.clan.fetchMember(msg.author.id);
    if (!clanMember) { attemptReply(msg, 'You are not currently in a fishing clan!\nJoin one with `.join`'); return; }
    
    let clan = await db.clan.fetchClan(clanMember.clan);
    let campaignInfo = api.gamedata.getCampaignData(clan.campaign_stage);
    let perks = getClanPerks(clan);

    if (!campaignInfo) { // completed highest campaign
        let options = {
            title: `Campaign Stage ${clan.campaign_stage} - (Coming Soon)`,
            color: '#2acaea',
            description: 'Congratulations, your clan has completed all available stages!\n\n\
Keep an eye out for updates, **more is coming soon!**'
        }
        let embed = await createEmbed(options);
        msg.channel.send(embed);
        return;
    }

    // construct embedFields
    let campaignProgressIDs = {};
    for (let fishID of clan.campaign_progress) {
        campaignProgressIDs[fishID] = (campaignProgressIDs[fishID] || 0) + 1;
    }
    
    let locations = {}, campaignProgress = {};
    for (let entry of campaignInfo.requirements) {
        let fishInfo = api.fishing.getFishData(entry[0]);
        let fishName = fishInfo.name.replace(/ /g, '_');
        campaignProgress[fishName] = campaignProgressIDs[entry[0]] || 0;
        if (!locations[fishInfo.location]) {
            locations[fishInfo.location] = {};
        }
        locations[fishInfo.location][fishName] = entry[1];
    }

    let embedFields = [];
    for (let [locationID, locationObj] of Object.entries(locations)) {
        let locationInfo = api.fishing.getLocationData(locationID);
        let field = { name: `Location ${locationID} - ${locationInfo.name}`, value: '', inline: true };
        for (let [fishName, required] of Object.entries(locationObj)) {
            field.value += `\n${capitalizeWords(fishName.replace(/_/g, ' '))} (${campaignProgress[fishName]}/${required})`;
        }
        embedFields.push(field);
        if (embedFields.length % 3 === 1) { // field spacing
            embedFields.push({ name: '\u200b', value: '\u200b', inline: true });
        }
    }
    // construct embedDescription
    let embedDescription = `**${campaignInfo.name}**\n\
    ${campaignInfo.description}\n\n\
    **Rewards**`;
    let rewards = campaignInfo.rewards;
    if (rewards.clanPoints) {
        embedDescription += `\n${rewards.clanPoints} Clan Points :shield:`;
        if (perks.campaign_mba) {
            embedDescription += `\n${perks.campaign_mba} Bonus Clan Points :shield:`;
        }
    }
    if (rewards.lollipops) { embedDescription += `\n${rewards.lollipops} Quest Points :lollipop:`; }
    if (rewards.coins) { embedDescription += `\n${rewards.coins} Coins :coin:`; }
    // final calculations
    let fishCaught = Object.values(campaignProgress).reduce((a, b) => a + b, 0);
    let fishRequired = Object.values(locations).map(obj => Object.values(obj).reduce((a, b) => a + b, 0)).reduce((a, b) => a + b, 0);
    let campaignPercent = Math.round(fishCaught / fishRequired * 100);

    const complete = fishCaught === fishRequired;
    // generate embed
    let options = {
        author: [`${clan.name}`, null],
        title: `Campaign Stage ${clan.campaign_stage} - (${complete ? 'Complete!' : `${campaignPercent}% Complete`})`,
        color: complete ? '#32cd32' : '#2acaea',
        description: embedDescription,
        fields: embedFields
    };
    let embed = await createEmbed(options);
    msg.channel.send(embed).then(async (sentEmbed) => {
        if (!complete) { return; }
        sentEmbed.react('🎉');
        const filter = ( reaction, user ) => (reaction.emoji.name === '🎉') && user.id === msg.author.id;
        const collector = await sentEmbed.createReactionCollector(filter, { time: 10000 });
        collector.on('collect', async (reactionData) => {
            collector.stop();
            if (clanMember.role !== 2) {
                attemptReply(msg, 'The Clan Leader :crown: must be the one to claim rewards and accept the next campaign stage!');
                return;
            }
            // double check that stage is completed
            clan = await db.clan.fetchClan(clan.id);
            campaignInfo = api.gamedata.getCampaignData(clan.campaign_stage);
            if (!campaignInfo || clan.campaign_progress.length !== campaignInfo.requirements_string.map(tuple => tuple[1]).reduce((a, b) => a + b, 0)) {
                attemptReply(msg, 'You have already claimed the reward for this stage!');
                return;
            }
            // handle rewards
            rewards = campaignInfo.rewards;
            await db.clan.updateColumn(clan.id, 'campaign_stage', 1);
            await db.clan.setColumn(clan.id, 'campaign_progress', []);
            db.clan.updateColumn(clan.id, 'clan_points', rewards.clanPoints + perks.campaign_mba);
            let useridArray = (await db.clan.fetchMembers(clan.id)).map(obj => obj.userid);
            if (rewards.lollipops) {
                db.users.updateArrayOfColumns(useridArray, 'lollipops', rewards.lollipops);
            }
            if (rewards.coins) {
                db.users.updateArrayOfColumns(useridArray, 'coins', rewards.coins);
            }

            let options = {
                title: `Claimed Rewards for Stage ${clan.campaign_stage}!`,
                color: '#32cd32',
                description: `Your clan gained **+${rewards.clanPoints + perks.campaign_mba} Clan Points**! :shield:\
${rewards.lollipops ? `\nEach member gained **+${rewards.lollipops} Quest Points**! :lollipop:` : ''}\
${rewards.coins ? `\nEach member gained **+${rewards.coins} Coins**! :coin:` : ''}`
            };
            let embed = await createEmbed(options);
            msg.channel.send(embed);
        });
        collector.on('end', async(collected, reason) => {
            try {
                sentEmbed.reactions.removeAll();
            } catch {

            }
        });
    });
}