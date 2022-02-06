const api = require('../../api');
const { loadImage } = require('canvas');

IMAGES = {};

async function preloadImages() {
    Promise.all([
        preloadCosmeticImages(),
        preloadFishImages(),
        preloadTierIcons(),
        preloadAquariumImages(),
        preloadBaitImages(),
        preloadLocationBackgroundImages(),
        preloadRodImages(),
        preloadHookImages(),
        preloadGloveImages(),
        preloadRingImages(),
        preloadSwivelImages(),
    ]).then(console.log('Preloaded Images!'));

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

    img = await loadImage(api.images.fetchAssetUrl('cloud'));
    IMAGES.cloud = img;

    img = await loadImage(api.images.fetchAssetUrl('rain'));
    IMAGES.rain = img;
}

async function preloadTierIcons() {
    IMAGES.tiers = {};
    const tiers = ['ss', 's', 'a', 'b', 'c', 'd', 'f'];
    for(let tier of tiers) {
        IMAGES.tiers[tier] = await loadImage(api.images.fetchAssetUrl(`${tier}_tier`));
    }
}

async function preloadCosmeticImages() {
    IMAGES.cosmetics = {
        equipment_banner: {}
    };
    const cosmeticNames = api.cosmetics.getAllEquipmentSkins().contents.map(obj => obj.src);
    let tasks = [];
    for (let i=0; i<cosmeticNames.length; i++) {
        tasks.push(loadCosmeticImage(cosmeticNames[i], i.toString(), 'equipment_banner'));
    }
    Promise.all(tasks)
}
async function loadCosmeticImage(name, id, category) {
    IMAGES.cosmetics[category][id] = await loadImage(api.images.fetchCosmeticUrl(name, category));
}

async function preloadFishImages() {
    const fishNames = api.fish.getFishNames();
    IMAGES.fish = Array(fishNames.length);
    let tasks = [];
    for(let i=0; i<fishNames.length; i++) {
        tasks.push(loadFishImage(i, fishNames[i]));
    }
    Promise.all(tasks);
}
async function loadFishImage(id, name) {
    IMAGES.fish[id] = await loadImage(api.images.fetchFishImgUrl(name));
}

async function preloadAquariumImages() {
    const aquariumLabels = api.aquarium.getAquariumNames();
    IMAGES.aquarium = Array(aquariumLabels.length);
    let tasks = [];
    for(let i=0; i<aquariumLabels.length; i++) {
        tasks.push(loadAquariumImage(i, aquariumLabels[i]));
    }
}
async function loadAquariumImage(id, name) {
    IMAGES.aquarium[id] = await loadImage(api.images.fetchAquariumImgUrl('aquarium_' + name));
}

async function preloadBaitImages() {
    IMAGES.bait = {};
    const baitNames = api.bait.getAllBaitNames();
    let tasks = [];
    for(let i=0; i<baitNames.length; i++) {
        tasks.push(loadBaitImage(baitNames[i]));
    }
    await loadBaitImage('container');
    Promise.all(tasks);
}
async function loadBaitImage(baitName) {
    IMAGES.bait[baitName] = await loadImage(api.images.fetchBaitImgUrl(baitName));
    return;
}

async function preloadLocationBackgroundImages() {
    IMAGES.locations = {
        regular: [],
        aquarium: []
    };
    const locationCount = api.fish.getLocationCount();
    for(let i=1; i<=locationCount; i++) {
        IMAGES.locations.regular.push(await loadImage(api.images.fetchBackgroundUrl(`${i}_bg`)));
        IMAGES.locations.aquarium.push(await loadImage(api.images.fetchBackgroundUrl(`${i}_bg_aq`)));
    }
}

async function preloadRodImages() {
    IMAGES.rods = {};
    const rodIDs = api.equipment.getRodIds();
    let tasks = [];
    for(let id of rodIDs) {
        tasks.push(loadRodImage(id));
    }
    Promise.all(tasks);
}
async function loadRodImage(id) {
    IMAGES.rods[id] = await loadImage(api.images.fetchRodImgUrl(id));
}

async function preloadHookImages() {
    IMAGES.hooks = {};
    const hookIDs = api.equipment.getHookIds();
    let tasks = [];
    for(let id of hookIDs) {
        tasks.push(loadHookImage(id));
    }
    Promise.all(tasks);
}
async function loadHookImage(id) {
    IMAGES.hooks[id] = await loadImage(api.images.fetchHookImgUrl(id))
}

async function preloadGloveImages() {
    IMAGES.gloves = {};
    let gloveIDs = api.equipment.getGloveIds();

    let tasks = [];
    for (let id of gloveIDs) {
        tasks.push(loadGloveImage(id));
    }
    Promise.all(tasks);
}
async function loadGloveImage(id) {
    IMAGES.gloves[id] = await loadImage(api.images.fetchGloveImgUrl(id))
}

async function preloadRingImages() {
    IMAGES.rings = {};
    let ringNames = api.equipment.getRingNames();
    let tasks = [];
    ringNames.forEach(element => tasks.push(loadRingImage(element)));
    Promise.all(tasks);
}
async function loadRingImage(ringName) {
    IMAGES.rings[ringName] = await loadImage(api.images.fetchRingImgUrl(ringName));
}

async function preloadSwivelImages() {
    IMAGES.swivels = {};
    let swivelIDs = api.equipment.getSwivelIds();

    let tasks = [];
    for (let id of swivelIDs) {
        tasks.push(loadSwivelImage(id));
    }
    Promise.all(tasks);
}
async function loadSwivelImage(id) {
    IMAGES.swivels[id] = await loadImage(api.images.fetchSwivelImgUrl(id));
}

preloadImages();

module.exports = IMAGES;