// interact with the aquarium database
const config = require('./config.js');

module.exports.getLargestSize = async function(userid, speciesName) {
    let columnName = speciesName.replace(' ', '_');
    console.log(columnName);
    let query = `SELECT ${columnName} FROM aquarium WHERE userid=$1`;
    let largestSize = (await config.pquery(query, [userid]))[0][columnName];
    return largestSize;
}

module.exports.setLargestSize = async function(userid, speciesName, size) {
    let columnName = speciesName.replace(' ', '_');
    let query = `UPDATE aquarium SET ${columnName}=$1 WHERE userid=$2`;
    await config.pquery(query, [size, userid]);
    console.log('Updated Aquarium!');
}