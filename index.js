// Shard Manager
const { ShardingManager } = require('discord.js');

const { discordToken } = require('./private/config.json');

const manager = new ShardingManager('./bot.js', { totalShards: 2, token: discordToken });

manager.on('shardCreate', shard => console.log(`Launched shard ${shard.id}`));

manager.spawn();

// spin-up webserver for top.gg votes
require('./lib/server.js');