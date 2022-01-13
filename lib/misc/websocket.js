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
    customFish: 'Premium Server'
};

socket.on('purchase', async (obj) => {
    if (global.client.shard.ids[0] !== 0) { return; }
    const discordUser = await global.client.users.fetch(obj.userid);
    discordUser.send(`**Thank you for supporting Big Tuna!**\nYou Received:
${obj.data.map(entry => `:small_blue_diamond: ${PRODUCT_MAP[entry.split(':')[0]]} x${entry.split(':')[1]}`).join('\n')}`).catch(() => 'Couldn\'t DM user (purchase).');
});


module.exports.pushStatsToWebsite = async function(kg) {
    if (DEV) {
        return;
    }
    socket.emit('catch', { fish: 1, kg: kg });
}