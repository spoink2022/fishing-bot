const api = require('../../api');
const { loadImage } = require('canvas');

global.IMAGES = {};

async function preloadImages() {
    Promise.all([
        preloadFishImages(),
        preloadRodImages(),
        preloadHookImages(),
        preloadTierIcons(),
        preloadAquariumImages(),
        preloadBackgroundImages()
    ]);

    img = await loadImage(api.images.fetchAssetUrl('tape'));
    //console.log('preloaded tape.png!');
    IMAGES.tapeStrip = img;

    img = await loadImage(api.images.fetchAssetUrl('fish_escaped'));
    IMAGES.fish_escaped = img;

    img = await loadImage(api.images.fetchAssetUrl('caught_fish_bg'));
    //console.log('preloaded caught_fish_bg.png!');
    IMAGES.caught_fish_bg = img;
}

async function preloadRodImages() {
    IMAGES.rods = {};
    const rodIDs = api.fishing.getRodIDs();
    for(let id of rodIDs) {
        IMAGES.rods[id] = await loadImage(api.images.fetchRodImgUrl(id));
    }
    console.log('preloaded fishing rod images!');
}

async function preloadHookImages() {
    IMAGES.hooks = {};
    const hookIDs = api.fishing.getHookIDs();
    for(let id of hookIDs) {
        IMAGES.hooks[id] = await loadImage(api.images.fetchHookImgUrl(id));
    }
    console.log('preloaded hook images!');
}

async function preloadTierIcons() {
    IMAGES.tiers = {};
    const tiers = ['ss', 's', 'a', 'b', 'c', 'd', 'f'];
    for(let tier of tiers) {
        IMAGES.tiers[tier] = await loadImage(api.images.fetchAssetUrl(`${tier}_tier`));
    }
    console.log('preloaded tier icons!');
}

async function preloadFishImages() {
    IMAGES.fish = {};
    const fishNames = api.fishing.getFishNames();
    for(let i=0; i<fishNames.length; i++) {
        IMAGES.fish[i.toString()] = await loadImage(api.images.fetchFishImgUrl(fishNames[i]));
    }
    console.log('preloaded fish images!');
}

async function preloadAquariumImages() {
    IMAGES.aquarium = {};
    const aquariumLabels = api.gamedata.getAquariumLabels();
    for(const[key, val] of Object.entries(aquariumLabels)) {
        if(val === 'aquarium_standard') { continue; }
        IMAGES.aquarium[key] = await loadImage(api.images.fetchAquariumUrl(val));
    }
    console.log('preloaded aquarium filters!');
}

async function preloadBackgroundImages() {
    IMAGES.bg = {};
    const locationCount = api.fishing.getLocationDatasetLength();
    for(let i=0; i<locationCount; i++) {
        IMAGES.bg[i.toString()] = await loadImage(api.images.fetchAssetUrl(`${i}_bg`));
        IMAGES.bg[`${i}_aq`] = await loadImage(api.images.fetchAssetUrl(`${i}_bg_aq`));
    }
    console.log('preloaded background images!');
}

preloadImages();