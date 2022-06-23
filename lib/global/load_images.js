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
        preloadHullImages(),
        preloadEngineImages(),
        preloadContainerImages(),
        preloadPropellerImages(),
        preloadClanLocationImages()
    ]).then(console.log('Preloaded Images!'));

    const miscImages = [
        'tape', 'fish_escaped', 'caught_fish_bg', 'caught_fish_bg_red', 'caught_fish_bg_green',
        'wanted', 'sun', 'cloud', 'rain', 'boat_docked', 'timeout'
    ];
    let tasks = [];
    for (let name of miscImages) {
        tasks.push(loadMiscImage(name));
    }
    Promise.all(tasks);
}
async function loadMiscImage(name) {
    IMAGES[name] = await loadImage(api.images.fetchAssetUrl(name));
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
        equipment_banner: {},
        clan_avatar: {}
    };
    let tasks = [];

    const equipmentBannerNames = api.cosmetics.getAllEquipmentSkins().contents.map(obj => obj.src);
    for (let i=0; i<equipmentBannerNames.length; i++) {
        tasks.push(loadCosmeticImage(equipmentBannerNames[i], i.toString(), 'equipment_banner'));
    }

    const clanAvatarNames = api.cosmetics.getCategoryData('clan_avatar').contents.map(obj => obj.src);
    for (let i=0; i<clanAvatarNames.length; i++) {
        tasks.push(loadCosmeticImage(clanAvatarNames[i], i.toString(), 'clan_avatar'));
    }

    Promise.all(tasks);
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

async function preloadHullImages() {
    IMAGES.hull = {};
    const count = api.clan.getHullCount();
    let tasks = [];

    for (let i=1; i<=count; i++) {
        tasks.push(loadHullImage(i));
    }
    Promise.all(tasks);
}
async function loadHullImage(id) {
    IMAGES.hull[id] = await loadImage(api.images.fetchHullImgUrl(id));
}

async function preloadEngineImages() {
    IMAGES.engine = {};
    const count = api.clan.getEngineCount();
    let tasks = [];

    for (let i=1; i<=count; i++) {
        tasks.push(loadEngineImage(i));
    }
    Promise.all(tasks);
}
async function loadEngineImage(id) {
    IMAGES.engine[id] = await loadImage(api.images.fetchEngineImgUrl(id));
}

async function preloadContainerImages() {
    IMAGES.container = {};
    const count = api.clan.getContainerCount();
    let tasks = [];

    for (let i=1; i<=count; i++) {
        tasks.push(loadContainerImage(i));
    }
    Promise.all(tasks);
}
async function loadContainerImage(id) {
    IMAGES.container[id] = await loadImage(api.images.fetchContainerImgUrl(id));
}

async function preloadPropellerImages() {
    IMAGES.propeller = {};
    const count = api.clan.getPropellerCount();
    let tasks = [];

    for (let i=1; i<=count; i++) {
        tasks.push(loadPropellerImage(i));
    }
    Promise.all(tasks);
}
async function loadPropellerImage(id) {
    IMAGES.propeller[id] = await loadImage(api.images.fetchPropellerImgUrl(id));
}

async function preloadClanLocationImages() {
    IMAGES.clanLocation = {};
    const count = Object.keys(api.clan.getAllClanLocationData()).length;
    let tasks = [];

    for (let i=1; i<=count; i++) {
        tasks.push(loadClanLocationImage(i));
        tasks.push(loadClanLocationImage(`${i}_fishing`));
    }
    Promise.all(tasks);
}
async function loadClanLocationImage(id) {
    IMAGES.clanLocation[id] = await loadImage(api.images.fetchClanLocationImgUrl(id));
}

preloadImages();

module.exports = IMAGES;