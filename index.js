// Shard Manager
const { ShardingManager } = require('discord.js');
const AutoPoster = require('topgg-autoposter');

const { discordToken, topggToken } = require('./private/config.json');

const manager = new ShardingManager('./bot.js', { token: discordToken });

manager.on('shardCreate', shard => console.log(`Launched shard ${shard.id}`));

manager.spawn();

// BELOW IS ONLY WHEN SHARDING


// register slash commands
require('./lib/deploy-commands.js');

// autopost stats to top.gg (Production only)
if (topggToken) {
    const ap = AutoPoster(topggToken, manager);

    ap.on('posted', () => {
        console.log('Posted stats to top.gg');
    });
}