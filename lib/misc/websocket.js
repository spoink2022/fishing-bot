const io = require('socket.io-client');

const { websocketUrl } = require('../../private/config.json');
const db = require('../../db');

// CODE
const socket = io(websocketUrl);
socket.on("connect", () => {
    console.log('Websocket Connected!');
});


let totalFishCaught = 0;
let totalTonsCaught = 0;

async function pullVariables() {
    totalFishCaught += parseInt(await db.users.fetchTotalFishCaught());
    totalTonsCaught += parseFloat(await db.users.fetchTotalWeightCaught());
}
pullVariables();

module.exports.pushStatsToWebsite = async function(tons) {
    if (config.DEV) {
        return;
    }
    totalFishCaught += 1;
    totalTonsCaught += tons;
    socket.emit('catch', { fish: totalFishCaught, tons: Math.round(totalTonsCaught*1000)/1000 });
}