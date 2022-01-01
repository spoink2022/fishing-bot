const config = require('./config.js');

module.exports.getCard = async function(cardId) {
    let query = 'SELECT * FROM cards WHERE id=$1';
    let card = (await config.pquery(query, [cardId]))[0];
    return card;
}

module.exports.getAllUserCards = async function(userid) {
    let query = 'SELECT * FROM cards WHERE userid=$1 ORDER BY id ASC';
    let cards = await config.pquery(query, [userid]);
    return cards;
}

module.exports.getCardByRelativeId = async function(userid, relativeId) {
    let query = `SELECT * FROM cards WHERE userid=$1 ORDER BY id ASC LIMIT 1 OFFSET ${relativeId-1}`;
    let card = (await config.pquery(query, [userid]))[0];
    return card;
}

module.exports.addCard = async function(c) {
    let query = 'INSERT INTO cards (userid, fish, r, grade) VALUES ($1, $2, $3, $4) RETURNING id';
    let cardId = (await config.pquery(query, [c.userid, c.fish, c.r, c.grade]))[0].id;
    return cardId;
}

module.exports.setCardOwner = async function(cardId, userid) {
    let query = 'UPDATE cards SET userid=$1 WHERE id=$2';
    return await config.pquery(query, [userid, cardId]);
}

module.exports.removeCard = async function(cardId) {
    let query = 'DELETE FROM cards WHERE id=$1';
    return await config.pquery(query, [cardId]);
}