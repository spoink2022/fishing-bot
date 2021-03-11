const Topgg = require('@top-gg/sdk')
const AutoPoster = require('topgg-autoposter');

const auth = require('../static/private/auth.json')

const api = new Topgg.Api(auth.topggToken);

module.exports.beginAutoposting = async function() {
    const ap = AutoPoster(auth.topggToken, client) // your discord.js or eris client

    ap.on('posted', () => {
        console.log('Posted stats to top.gg');
    });
}