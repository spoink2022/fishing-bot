const config = require('./config.js');

module.exports.getEquippedCosmetic = async function(userid, category) {
    let query = `SELECT cosmetic_id FROM cosmetics WHERE category=$1 AND equipped=TRUE AND userid=$2`;
    let res = await config.pquery(query, [category, userid]);
    return res[0] ? res[0].cosmetic_id : null;
}

module.exports.getAllCosmetics = async function(userid) {
    let query = 'SELECT * FROM cosmetics WHERE userid=$1 ORDER BY id';
    let res = await config.pquery(query, [userid]);
    return res;
}

module.exports.getCosmetic = async function(userid, category, index) {
    let query = 'SELECT * FROM cosmetics WHERE userid=$1 AND category=$2 ORDER BY id';
    let res = await config.pquery(query, [userid, category]);
    return res[index];
}

module.exports.getCosmeticCount = async function(category, cosmeticID) {
    let query = 'SELECT COUNT(id) FROM cosmetics WHERE category=$1 AND cosmetic_id=$2';
    let res = await config.pquery(query, [category, cosmeticID]);
    return res[0].count;
}

// MODIFY COSMETICS ENTRY
module.exports.unequipCosmetic = async function(id) {
    let query = 'UPDATE cosmetics SET equipped=FALSE WHERE id=$1';
    await config.pquery(query, [id]);
    return;
}

module.exports.equipCosmetic = async function(id, category) {
    // set other equips in category to false
    let query = 'UPDATE cosmetics SET equipped=FALSE WHERE category=$1 AND equipped=TRUE AND NOT id=$2';
    await config.pquery(query, [category, id]);

    query = 'UPDATE cosmetics SET equipped=TRUE WHERE id=$1';
    config.pquery(query, [id]);
    return;
}

module.exports.deleteCosmetic = async function(id) {
    let query = 'DELETE FROM cosmetics WHERE id=$1';
    await config.pquery(query, [id]);
    return;
}