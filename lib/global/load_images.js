const api = require('../../api');
const { loadImage } = require('canvas');

global.IMAGES = {};

async function preloadImages() {
    let img = await loadImage(api.images.fetchAssetUrl('tape'));
    console.log('preloaded tape.png!');
    IMAGES.tapeStrip = img;
}

preloadImages();