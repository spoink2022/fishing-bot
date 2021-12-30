const { getDateAsString } = require('../lib/misc/datetime.js');

const config = require('./config.js');

// NEW -- START
module.exports.fetchClan = async function(clanId) {
    let query = 'SELECT * FROM clan WHERE id=$1 LIMIT 1';
    let res = await config.pquery(query, [clanId]);
    return res[0];
}

module.exports.fetchClanByUserid = async function(userid) {
    let query = 'SELECT * FROM clan WHERE id=(SELECT clan FROM clan_member WHERE userid=$1) LIMIT 1';
    let res = await config.pquery(query, [userid]);
    return res[0];
}

module.exports.createClan = async function(name) {
    let query = 'INSERT INTO clan (name, created) VALUES ($1, $2) RETURNING id';
    let clanId = (await config.pquery(query, [name, Date.now()]))[0].id;
    return clanId;
}

module.exports.setClanName = async function(clanId, newName, paid=true) {
    let query = `UPDATE clan SET name=$1, rename=rename-$2 WHERE id=$3`;
    return await config.pquery(query, [newName, paid ? 1 : 0, clanId]);
}

module.exports.fetchMember = async function(userid) {
    let query = 'SELECT * FROM clan_member WHERE userid=$1 LIMIT 1';
    let res = await config.pquery(query, [userid]);
    return res[0];
}

module.exports.setMemberTag = async function(userid, username) {
    let query = 'UPDATE clan_member SET username=$1 WHERE userid=$2';
    return await config.pquery(query, [username, userid]);
}

module.exports.setMemberRole = async function(userid, newRole) {
    let query = 'UPDATE clan_member SET role=$1 WHERE userid=$2';
    return await config.pquery(query, [newRole, userid]);
}

module.exports.removeMember = async function(userid) {
    let query = 'DELETE FROM clan_member WHERE userid=$1';
    return await config.pquery(query, [userid]);
}

module.exports.createClanMember = async function(userid, tag, clanId, role=0) {
    let query = 'INSERT INTO clan_member (userid, tag, clan, role, joined) VALUES ($1, $2, $3, $4, $5)';
    return await config.pquery(query, [userid, tag, clanId, role, Date.now()]);
}

module.exports.fetchMemberByMemberId = async function(clanId, memberId) { // memberId is index in memberlist
    let query = 'SELECT clan_member.* FROM users, clan_member WHERE users.userid=clan_member.userid AND clan_member.clan=$1 ORDER BY users.level DESC, users.exp DESC OFFSET $2 LIMIT 1';
    let res = (await config.pquery(query, [clanId, memberId-1]))[0];
    return res;
}

module.exports.fetchMembers = async function(clanId) {
    let query = 'SELECT users.opted_in, users.level, users.cooldown, clan_member.joined, clan_member.userid, clan_member.tag, clan_member.role, clan_member.campaign_catches, clan_member.last_campaign_catch FROM users, clan_member WHERE users.userid=clan_member.userid AND clan_member.clan=$1 ORDER BY users.level DESC, users.exp DESC';
    let res = await config.pquery(query, [clanId]);
    return res;
}
// NEW -- END

// GENERAL


module.exports.fetchClanByName = async function(name) {
    let query = 'SELECT * FROM clan WHERE name=$1 LIMIT 1';
    let res = await config.pquery(query, [name]);
    return res[0];
}

module.exports.fetchMemberByUsername = async function(username) {
    let query = 'SELECT * FROM clan_member WHERE username=$1 LIMIT 1';
    let res = await config.pquery(query, [username]);
    return res[0];
}

// UPDATE CLAN MEMBER STATUS
module.exports.setRole = async function(userid, role) {
    let query = 'UPDATE clan_member SET role=$1 WHERE userid=$2';
    await config.pquery(query, [role, userid]);
    return;
}

module.exports.setUsername = async function(userid, username) {
    let query = 'UPDATE clan_member SET username=$1 WHERE userid=$2';
    await config.pquery(query, [username, userid]);
    return;
}

module.exports.kickMember = async function(userid) {
    let query = 'DELETE FROM clan_member WHERE userid=$1;';
    await config.pquery(query, [userid]);
    return;
}

module.exports.joinMember = async function(userid, username, clan) {
    let query = 'INSERT INTO clan_member (userid, date, clan, username) VALUES ($1, $2, $3, $4)';
    await config.pquery(query, [userid, getDateAsString(), clan, username]);
    return;
}

module.exports.setClanMemberColumn = async function(userid, column, value) {
    let query = `UPDATE clan_member SET ${column}=$1 WHERE userid=$2`;
    await config.pquery(query, [value, userid]);
    return;
}

module.exports.creditMemberWithCampaignCatch = async function(userid) {
    let query = 'UPDATE clan_member SET campaign_catches=campaign_catches+1 WHERE userid=$1';
    await config.pquery(query, [userid]);
    return;
}

// UPDATE CLAN STATUS
module.exports.createClanOLD = async function(userid, username) {
    // create clan entry
    let query = 'INSERT INTO clan (name, date) VALUES ($1, $2) RETURNING id';
    let clanID = (await config.pquery(query, ['processing...', getDateAsString()]))[0].id;
    // update name
    query = 'UPDATE clan SET name=$1 WHERE id=$2';
    config.pquery(query, [`Unnamed Clan ${clanID}`, clanID]);
    // create clan_member (leader)
    query = 'INSERT INTO clan_member (userid, role, date, clan, username) VALUES ($1, $2, $3, $4, $5)';
    config.pquery(query, [userid, 2, getDateAsString(), clanID, username]);
    return;
}

module.exports.renameClan = async function(clanID, newName) {
    let query = 'UPDATE clan SET name=$1, rename=rename-1 WHERE id=$2';
    await config.pquery(query, [newName, clanID]);
    return;
}

module.exports.incrementCaught = async function(clanID) {
    let query = 'UPDATE clan SET fish_caught=fish_caught+1 WHERE id=$1';
    await config.pquery(query, [clanID]);
    return;
}

module.exports.setPassword = async function(clanID, newPassword) {
    let query = 'UPDATE clan SET password=$1 WHERE id=$2';
    await config.pquery(query, [newPassword, clanID]);
    return;
}

module.exports.deleteClan = async function(clanID) {
    let query = 'DELETE FROM clan WHERE id=$1';
    await config.pquery(query, [clanID]);
    return;
}

module.exports.setColumn = async function(clanID, columnName, value) {
    let query = `UPDATE clan SET ${columnName}=$1 WHERE id=$2`;
    await config.pquery(query, [value, clanID]);
    return;
}

module.exports.updateColumn = async function(clanID, columnName, value) {
    let query = `UPDATE clan SET ${columnName}=${columnName}+$1 WHERE id=$2`;
    await config.pquery(query, [value, clanID]);
    return;
}

// CAMPAIGN
module.exports.addCampaignCatch = async function(clanID, fishID) {
    let query = 'UPDATE clan SET campaign_progress=ARRAY_APPEND(campaign_progress, $1) WHERE id=$2';
    await config.pquery(query, [fishID, clanID]);
    return;
}