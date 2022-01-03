const config = require('./config.js');

module.exports.getAllSkins = async function(userid) {
    let query = 'SELECT * FROM cosmetics WHERE userid=$1 ORDER BY category ASC, id ASC';
    let res = await config.pquery(query, [userid]);
    return res;
}

module.exports.getAllSkinsOfCategory = async function(userid, categoryId) {
    let query = 'SELECT * FROM cosmetics WHERE userid=$1 AND category=$2';
    let res = await config.pquery(query, [userid, categoryId]);
    return res;
}

module.exports.getSkin = async function(skinId) {
    let query = 'SELECT * FROM cosmetics WHERE id=$1';
    let skin = (await config.pquery(query, [skinId]))[0];
    return skin;
}

module.exports.equipSkin = async function(userid, skinId) {
    let query = 'UPDATE cosmetics SET equipped=FALSE WHERE userid=$1 AND category=(SELECT category FROM cosmetics WHERE id=$2)';
    await config.pquery(query, [userid, skinId]);
    query = 'UPDATE cosmetics SET equipped=TRUE WHERE id=$1';
    return await config.pquery(query, [skinId]);
}

module.exports.unequipSkin = async function(skinId) {
    let query = 'UPDATE cosmetics SET equipped=FALSE WHERE id=$1';
    return await config.pquery(query, [skinId]);
}

module.exports.setSkinOwner = async function(skinId, userid) {
    let query = 'UPDATE cosmetics SET userid=$1, equipped=FALSE WHERE id=$2';
    return await config.pquery(query, [userid, skinId]);
}

module.exports.deleteSkin = async function(skinId) {
    let query = 'DELETE FROM cosmetics WHERE id=$1';
    return await config.pquery(query, [skinId]);
}

module.exports.getSkinByRelativeId = async function(userid, categoryId, relativeId) {
    let query = `SELECT * FROM cosmetics WHERE userid=$1 AND category=$2 ORDER BY id ASC LIMIT 1 OFFSET ${relativeId - 1}`;
    let skin = (await config.pquery(query, [userid, categoryId]))[0];
    return skin;
}

module.exports.getEquippedSkin = async function(userid, categoryId) {
    let query = `SELECT cosmetic_id FROM cosmetics WHERE category=$1 AND equipped=TRUE AND userid=$2 ORDER BY id LIMIT 1`;
    let res = await config.pquery(query, [categoryId, userid]);
    return res[0] ? res[0].cosmetic_id : null;
}

module.exports.getGlobalSupply = async function(categoryId, cosmeticId) {
    let query = 'SELECT COUNT(id) AS total FROM cosmetics WHERE category=$1 AND cosmetic_id=$2';
    let total = (await config.pquery(query, [categoryId, cosmeticId]))[0].total;
    return total;
}