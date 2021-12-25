const config = require('./config.js');

module.exports.getRing = async function(ringID) {
    let query = 'SELECT * FROM rings WHERE id=$1 LIMIT 1';
    let ring = (await config.pquery(query, [ringID]))[0];
    return ring;
}