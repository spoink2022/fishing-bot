// Program
const config = require('./config.js');

module.exports.fetchFishingInfo = async function(userid) {
    let query = 'SELECT * FROM fishing WHERE userid=$1';
    let fishing = (await config.pquery(query, [userid]))[0];
    return fishing;
}