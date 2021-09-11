const api = require('../../api');
const { loadImage } = require('canvas');

global.IMAGES = {};

async function preloadImages() {
    Promise.all([
        preloadFishImages(),
        preloadTierIcons(),
        preloadAquariumImages(),
        preloadBaitImages(),
        preloadBackgroundImages(),
        preloadRodImages(),
        preloadHookImages(),
        preloadGloveImages(),
        preloadRingImages(),
        preloadSwivelImages(),
    ]);

    img = await loadImage(api.images.fetchAssetUrl('tape'));
    //console.log('preloaded tape.png!');
    IMAGES.tapeStrip = img;

    img = await loadImage(api.images.fetchAssetUrl('fish_escaped'));
    IMAGES.fish_escaped = img;

    img = await loadImage(api.images.fetchAssetUrl('caught_fish_bg'));
    //console.log('preloaded caught_fish_bg.png!');
    IMAGES.caught_fish_bg = img;

    img = await loadImage(api.images.fetchAssetUrl('caught_fish_bg_red'));
    //console.log('preloaded caught_fish_bg_red.png!');
    IMAGES.caught_fish_bg_red = img;

    img = await loadImage(api.images.fetchAssetUrl('caught_fish_bg_green'));
    IMAGES.caught_fish_bg_green = img;

    img = await loadImage(api.images.fetchAssetUrl('wanted'));
    IMAGES.wanted = img;

    img = await loadImage(api.images.fetchAssetUrl('sun'));
    IMAGES.sun = img;

    img = await loadImage(api.images.fetchAssetUrl('rain'));
    IMAGES.rain = img;
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
    let tasks = [];
    for(let i=0; i<fishNames.length; i++) {
        tasks.push(loadFishImage(i, fishNames[i]));
    }
    Promise.all(tasks).then(() => console.log('preloaded fish images!'));
}
async function loadFishImage(id, name) {
    IMAGES.fish[id.toString()] = await loadImage(api.images.fetchFishImgUrl(name));
    //IMAGES.fish[id.toString()] = await loadImage(`http://localhost/images/tmp/${name.replace(/ /g, '_')}.png`);
}

async function preloadAquariumImages() {
    IMAGES.aquarium = {};
    const aquariumLabels = api.gamedata.getAquariumLabels();
    for(let label of aquariumLabels) {
        IMAGES.aquarium[label.substring(9)] = await loadImage(api.images.fetchAquariumUrl(label));
    }
    console.log('preloaded aquarium filters!');
}

async function preloadBaitImages() {
    IMAGES.bait = {};
    const baitNames = Object.keys(api.gamedata.getAllBaitData());
    let tasks = [];
    for(let i=0; i<baitNames.length; i++) {
        tasks.push(loadBaitImage(baitNames[i]));
    }
    await loadBaitImage('container');
    Promise.all(tasks).then(() => console.log('preloaded bait images!'));
}
async function loadBaitImage(baitName) {
    IMAGES.bait[baitName] = await loadImage(api.images.fetchBaitImgUrl(baitName.replace(/ /g, '_')));
    return;
}

async function preloadBackgroundImages() {
    IMAGES.bg = {};
    const locationCount = api.fishing.getLocationDatasetLength();
    for(let i=1; i<=locationCount; i++) {
        IMAGES.bg[i.toString()] = await loadImage(api.images.fetchBackgroundUrl(`${i}_bg`));
        IMAGES.bg[`${i}_aq`] = await loadImage(api.images.fetchBackgroundUrl(`${i}_bg_aq`));
    }
    console.log('preloaded background images!');
}

async function preloadRodImages() {
    IMAGES.rods = {};
    const rodIDs = api.fishing.getRodIDs();
    let tasks = [];
    for(let id of rodIDs) {
        tasks.push(loadRodImage(id));
    }
    Promise.all(tasks).then(() => console.log('preloaded fishing rod images!'));
}
async function loadRodImage(id) {
    IMAGES.rods[id] = await loadImage(api.images.fetchRodImgUrl(id));
}

async function preloadHookImages() {
    IMAGES.hooks = {};
    const hookIDs = api.fishing.getHookIDs();
    let tasks = [];
    for(let id of hookIDs) {
        tasks.push(loadHookImage(id));
    }
    Promise.all(tasks).then(() => console.log('preloaded hook images!'));
}
async function loadHookImage(id) {
    IMAGES.hooks[id] = await loadImage(api.images.fetchHookImgUrl(id))
}

async function preloadGloveImages() {
    IMAGES.gloves = {};
    let gloveIDs = api.fishing.getAllGloveData().map(obj => obj.id);

    let tasks = [];
    for (let id of gloveIDs) {
        tasks.push(loadGloveImage(id));
    }
    Promise.all(tasks).then(() => console.log('preloaded glove images!'));
}
async function loadGloveImage(id) {
    IMAGES.gloves[id] = await loadImage(api.images.fetchGloveImgUrl(id))
}

async function preloadRingImages() {
    IMAGES.rings = {};
    let ringNames = Object.keys(api.fishing.getAllRingData());
    let tasks = [];
    ringNames.forEach(element => tasks.push(loadRingImage(element)));
    Promise.all(tasks).then(() => console.log('preloaded ring images!'));
}
async function loadRingImage(ringName) {
    IMAGES.rings[ringName] = await loadImage(api.images.fetchRingImgUrl(ringName));
}

async function preloadSwivelImages() {
    IMAGES.swivels = {};
    let swivelIDs = api.fishing.getAllSwivelData().map(obj => obj.id);

    let tasks = [];
    for (let id of swivelIDs) {
        tasks.push(loadSwivelImage(id));
    }
    Promise.all(tasks).then(() => console.log('preloaded swivel images!'));
}
async function loadSwivelImage(id) {
    IMAGES.swivels[id] = await loadImage(api.images.fetchSwivelImgUrl(id))
}

//preloadImages();