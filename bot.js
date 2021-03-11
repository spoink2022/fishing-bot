const auth = require('./static/private/auth.json');

global.PREFIX = '.';
global.client = require('./lib/client.js');
require('./lib/server.js');
if(auth.topggToken) { require('./lib/autopost.js'); }
require('./lib/global/load_images.js');