const config = require('./config.js');

module.exports.getRing = async function(ringID) {
    let query = 'SELECT * FROM rings WHERE id=$1 LIMIT 1';
    let ring = (await config.pquery(query, [ringID]))[0];
    return ring;
}

module.exports.getRingByRelativeId = async function(userid, relativeId) {
    let query = `SELECT * FROM rings WHERE userid=$1 ORDER BY id ASC LIMIT 1 OFFSET ${relativeId-1}`;
    let ring = (await config.pquery(query, [userid]))[0];
    return ring;
}

module.exports.getAllUserRings = async function(userid) {
    let query = 'SELECT * FROM rings WHERE userid=$1 ORDER BY id ASC';
    let rings = await config.pquery(query, [userid]);
    return rings;
}

module.exports.addRing = async function(r) {
    let query = 'INSERT INTO rings (userid, ring_type, value, s, m, l, xl, premium, sashimi, trophy) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id';
    let ringID = (await config.pquery(query, [r.userid, r.ring_type, r.value, r.s, r.m, r.l, r.xl, r.premium, r.sashimi, r.trophy]))[0].id;
    return ringID;
}

module.exports.removeRing = async function(ringId) {
    let query = 'DELETE FROM rings WHERE id=$1';
    return await config.pquery(query, [ringId]);
}

module.exports.setRingOwner = async function(ringId, userid) {
    let query = 'UPDATE rings SET userid=$1, value=0 WHERE id=$2';
    return await config.pquery(query, [userid, ringId]);
}