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

module.exports.setClanPassword = async function(clanId, newPassword) {
    let query = 'UPDATE clan SET password=$1 WHERE id=$2';
    return await config.pquery(query, [newPassword, clanId]);
}

module.exports.updateClanColumns = async function(clanId, obj) {
    let queryMiddle = Object.keys(obj).map(key => `${key}=${key}+${obj[key]}`).join(', ');
    let query = `UPDATE clan SET ${queryMiddle} WHERE id=$1`;
    return await config.pquery(query, [clanId]);
}

module.exports.setClanColumns = async function(clanId, obj) {
    let queryMiddle = Object.keys(obj).map(key => `${key}=${obj[key]}`).join(', ');
    let query = `UPDATE clan SET ${queryMiddle} WHERE id=$1`;
    return await config.pquery(query, [clanId]);
}

module.exports.appendToClanCampaignProgress = async function(clanId, fishId) {
    let query = 'UPDATE clan SET campaign_progress=ARRAY_APPEND(campaign_progress, $1) WHERE id=$2';
    return await config.pquery(query, [fishId, clanId]);
}

module.exports.resetClanCampaignProgress = async function(clanId) {
    let query = 'UPDATE clan SET campaign_progress=ARRAY[]::INT[] WHERE id=$1';
    return await config.pquery(query, [clanId]);
}

module.exports.fetchMember = async function(userid) {
    let query = 'SELECT * FROM clan_member WHERE userid=$1 LIMIT 1';
    let res = await config.pquery(query, [userid]);
    return res[0];
}

module.exports.setMemberTag = async function(userid, tag) {
    let query = 'UPDATE clan_member SET tag=$1 WHERE userid=$2';
    return await config.pquery(query, [tag, userid]);
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
    let query = 'SELECT users.opted_in, users.level, users.cooldown, clan_member.* FROM users, clan_member WHERE users.userid=clan_member.userid AND clan_member.clan=$1 ORDER BY users.level DESC, users.exp DESC';
    let res = await config.pquery(query, [clanId]);
    return res;
}

module.exports.setBoatClaimableToTrue = async function(clanId) {
    let query = 'UPDATE clan_member SET claimed=FALSE WHERE clan=$1';
    return await config.pquery(query, [clanId]);
}

module.exports.setMemberColumn = async function(userid, column, value) {
    let query = `UPDATE clan_member SET ${column}=$1 WHERE userid=$2`;
    await config.pquery(query, [value, userid]);
    return;
}

module.exports.updateMemberColumn = async function(userid, column, value) {
    let query = `UPDATE clan_member SET ${column}=${column}+$1 WHERE userid=$2`;
    return await config.pquery(query, [value, userid]);
}

module.exports.setClanColumn = async function(clanId, column, value) {
    let query = `UPDATE clan SET ${column}=$1 WHERE id=$2`;
    return await config.pquery(query, [value, clanId]);
}

// Summation Queries
module.exports.fetchClanCount = async function() {
    let query = 'SELECT COUNT(id) AS clans FROM clan';
    let res = (await config.pquery(query))[0];
    return res;
}

module.exports.fetchMemberCounts = async function(clanIds) {
    let query = `SELECT clan, COUNT(id) FROM clan_member WHERE clan=ANY($1) GROUP BY clan`;
    let memberCounts = await config.pquery(query, [clanIds]);
    return memberCounts;
}

module.exports.fetchMemberLevelSums = async function(clanIds) {
    let query = `WITH levels AS (SELECT clan_member.clan, users.level FROM users INNER JOIN clan_member ON clan_member.clan=ANY($1) AND users.userid=clan_member.userid) SELECT clan, SUM(level) FROM levels GROUP BY clan`;
    let levelSums = await config.pquery(query, [clanIds]);
    return levelSums;
}
// Bulk Queries
module.exports.fetchRandomJoinableClans = async function() {
    let query = 'SELECT * FROM clan WHERE password IS NULL AND NOT is_full AND last_fished > $1 ORDER BY RANDOM() LIMIT 3';
    let clans = await config.pquery(query, [Date.now() - 604800000]);
    return clans;
}

// NEW -- END
// Personal
module.exports.fetchAllClanMembers = async function() {
    let query = 'SELECT userid, role FROM clan_member WHERE role != 0';
    return await config.pquery(query);
}