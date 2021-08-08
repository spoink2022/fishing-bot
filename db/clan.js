const { getDateAsString } = require('../lib/misc/datetime.js');

const config = require('./config.js');

// GENERAL
module.exports.fetchClan = async function(clanID) {
    let query = 'SELECT * FROM clan WHERE id=$1 LIMIT 1';
    let res = await config.pquery(query, [clanID]);
    return res[0];
}

module.exports.fetchClanByName = async function(name) {
    let query = 'SELECT * FROM clan WHERE name=$1 LIMIT 1';
    let res = await config.pquery(query, [name]);
    return res[0];
}

module.exports.fetchMember = async function(userid) {
    let query = 'SELECT * FROM clan_member WHERE userid=$1 LIMIT 1';
    let res = await config.pquery(query, [userid]);
    return res[0];
}

module.exports.fetchMemberByUsername = async function(username) {
    let query = 'SELECT * FROM clan_member WHERE username=$1 LIMIT 1';
    let res = await config.pquery(query, [username]);
    return res[0];
}

module.exports.fetchMembers = async function(clanID) {
    let query = 'SELECT * FROM clan_member WHERE clan=$1';
    let res = await config.pquery(query, [clanID]);
    return res;
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

// UPDATE CLAN STATUS
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