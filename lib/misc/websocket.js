const io = require('socket.io-client');

const { DEV, websocketUrl } = require('../../private/config.json');

// CODE
const socket = io(websocketUrl);
socket.on("connect", () => {
    console.log('Websocket Connected!');
});

const PRODUCT_MAP = {
    oneDayHost: 'Supporter',
    oneWeekHost: 'Big Supporter',
    customFish: 'Server Boost'
};

socket.on('purchase', async (obj) => {
    if (!client.shard.ids.includes(0)) { return }
    const discordUser = await client.users.fetch(obj.userid);
    discordUser.send(`**Thank you for supporting Big Tuna!**\nYou Received:
${obj.data.map(entry => `:small_blue_diamond: ${PRODUCT_MAP[entry.split(':')[0]]} x${entry.split(':')[1]}`).join('\n')}`);
});


module.exports.pushStatsToWebsite = async function(kg) {
    if (DEV) {
        return;
    }
    socket.emit('catch', { fish: 1, kg: kg });
}