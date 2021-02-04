const api = require('../../api');
const { loadImage } = require('canvas');

global.IMAGES = {};

async function preloadImages() {
    let img = await loadImage(api.images.fetchAssetUrl('tape'));
    console.log('preloaded tape.png!');
    IMAGES.tapeStrip = img;
    for(let tier of ['ss', 's', 'a', 'b', 'c', 'd', 'f']) {
        let img = await loadImage(api.images.fetchAssetUrl(`${tier}_tier`));
        IMAGES[`tier_${tier}`] = img;
        console.log(`preloaded ${tier}_tier.png!`);
    }
}

preloadImages();