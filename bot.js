// Run all tasks necessary to Big Tuna
// # ------------------------------- #
const { topggToken } = require('./private/config.json');

// login client
global.client = require('./lib/client.js');

// autopost stats to top.gg (Production only)
if (topggToken) { require('./lib/autopost.js'); }

// preload images
require('./lib/global/load_images.js');

// register slash commands
require('./lib/deploy-commands.js');