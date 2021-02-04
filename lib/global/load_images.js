const api = require('../../api');
const { loadImage } = require('canvas');

global.IMAGES = {};

async function preloadImages() {
    preloadRods();

    let img = await loadImage(api.images.fetchLocationImgUrl(0));
    console.log('preloaded background images!');
    IMAGES.locationBackgrounds = [img];

    img = await loadImage(api.images.fetchAssetUrl('tape'));
    console.log('preloaded tape.png!');
    IMAGES.tapeStrip = img;

    for(let tier of ['ss', 's', 'a', 'b', 'c', 'd', 'f']) {
        let img = await loadImage(api.images.fetchAssetUrl(`${tier}_tier`));
        IMAGES[`tier_${tier}`] = img;
        console.log(`preloaded ${tier}_tier.png!`);
    }

    img = await loadImage(api.images.fetchAssetUrl('caught_fish_bg'));
    console.log('preloaded caught_fish_bg.png!');
    IMAGES.caught_fish_bg = img;
}

async function preloadRods() {
    IMAGES.rods = {};
    const AllRodData = api.fishing.getAllRodData();
    for(let rod of AllRodData) {
        IMAGES.rods[rod.id] = await loadImage(api.images.fetchRodImgUrl(rod.id));
    }
    console.log('preloaded fishing rod images!');
}

preloadImages();