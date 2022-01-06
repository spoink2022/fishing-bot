// login client
client = require('./lib/client.js');

// MOVE BELOW TO INDEX.JS FOR SHARDING
const AutoPoster = require('topgg-autoposter');

const { discordToken, topggToken } = require('./private/config.json');
// spin-up webserver for top.gg votes
require('./lib/server.js');

// register slash commands
require('./lib/deploy-commands.js');

// autopost stats to top.gg (Production only)
if (topggToken) {
    const ap = AutoPoster(topggToken, client);

    ap.on('posted', () => {
        console.log('Posted stats to top.gg');
    });
}