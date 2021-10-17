const config = require('./config.js');

module.exports.getEquippedCosmetic = async function(userid, category) {
    let query = `SELECT cosmetic_id FROM cosmetics WHERE category=$1 AND equipped=TRUE AND userid=$2`;
    let res = await config.pquery(query, [category, userid]);
    return res[0] ? res[0].cosmetic_id : null;
}