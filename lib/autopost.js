const Topgg = require('@top-gg/sdk')
const AutoPoster = require('topgg-autoposter');

const { topggToken } = require('../private/config.json')

//const api = new Topgg.Api(topggToken);

module.exports.beginAutoposting = async function() {
    const ap = AutoPoster(topggToken, client) // your discord.js or eris client

    ap.on('posted', () => {
        console.log('Posted stats to top.gg');
    });
}