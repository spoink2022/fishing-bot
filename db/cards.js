const config = require('./config.js');

module.exports.getCard = async function(cardId) {
    let query = 'SELECT * FROM cards WHERE id=$1';
    let card = (await config.pquery(query, [cardId]))[0];
    return card;
}

module.exports.getCardByRelativeId = async function(userid, relativeId) {
    let query = `SELECT * FROM cards WHERE userid=$1 ORDER BY id ASC LIMIT 1 OFFSET ${relativeId-1}`;
    let card = (await config.pquery(query, [userid]))[0];
    return card;
}

module.exports.removeCard = async function(cardId) {
    let query = 'DELETE FROM cards WHERE id=$1';
    return await config.pquery(query, [cardId]);
}