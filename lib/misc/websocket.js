const io = require('socket.io-client');

const config = require('../../static/private/config.json');
const db = require('../../db');

// CODE
const socket = io(config.websocketUrl);
socket.on("connect", () => {
    console.log('Websocket Connected!');
});


let totalFishCaught = 0;
let totalTonsCaught = 0;

async function pullVariables() {
    totalFishCaught += parseInt(await db.stats.fetchTotalFishCaught());
    totalTonsCaught += parseFloat(await db.stats.fetchTotalTonsCaught());
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