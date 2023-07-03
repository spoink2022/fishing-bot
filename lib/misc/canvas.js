// Handle All Canvas Aspects of Big Tuna
// # --------------------------------- #

const { createCanvas } = require('canvas');

const api = require('../../api');
const logic = require('../logic');

const IMAGES = require('../global/load_images.js');

// Drawing Constants
const TIER_SIZES = { 'D': 0.6, 'C': 0.7, 'B': 0.8, 'A': 0.9, 'S': 1, 'SS': 1.1 };

module.exports.createAquariumCanvas = async function(user, locationId, FishValues, FishData) {
    // Canvas for "aquarium" command
    const S = 300;
    let canvas = createCanvas(4*S, 3*S);
    let ctx = canvas.getContext('2d');

    let bgImg = IMAGES.locations.aquarium[locationId-1];
    ctx.drawImage(bgImg, 0, 0, 4*S, 3*S);

    for (let i=0; i<FishData.length; i++) {
        if (FishValues[FishData[i].name] === -1) { continue; }
        const fish = FishData[i];
        const fishImg = IMAGES.fish[fish.id];
        const imgWidth = Math.round(S * 0.12 * fish.screenLen * (0.6 + FishValues[fish.name]/2));
        const imgHeight = Math.round(imgWidth * (fishImg.height/fishImg.width));
        const tilt = Math.round(-20 + Math.random() * 40); // [-20, 20], discrete
        const flip = Math.floor(Math.random() * 2); // [0, 1], discrete
        const x = Math.round(0.1*S + Math.random() * (3.7*S - imgWidth));
        const y = Math.round(0.1*S + Math.random() * (2.8*S - imgHeight));
        ctx.save();
        ctx.translate(x + imgWidth/2, y + imgHeight/2);
        if (flip) { ctx.scale(-1, 1); }
        ctx.rotate(tilt * Math.PI / 180);
        ctx.drawImage(fishImg, -imgWidth/2, -imgHeight/2, imgWidth, imgHeight);
        ctx.restore();
    }

    let aquariumImg = IMAGES.aquarium[user.aquarium];
    ctx.drawImage(aquariumImg, 0, 0, 4*S, 3*S);

    return canvas.toBuffer();
}

module.exports.createBountyCanvas = async function(fishName, tier, completed) {
    // Canvas for "bounty" command
    const S = 150;
    let canvas = createCanvas(4*S, 1.5*S);
    let ctx = canvas.getContext('2d');

    const FishData = api.fish.getFishDataByName(fishName);

    let bgImg = completed ? IMAGES.caught_fish_bg_green : IMAGES.caught_fish_bg_red;
    ctx.drawImage(bgImg, 0, 0, 4*S, 1.5*S);

    let fishImg = IMAGES.fish[FishData.id];
    
    let scale = 0.9*4*S/fishImg.width; // scale to width (default)
    if (fishImg.width/fishImg.height < 8/3) { // scale to height if fish is less wide than 8:3 
        scale = 0.9*1.5*S/fishImg.height;
    }
    scale *= TIER_SIZES[tier] * Math.min(1, FishData.screenLen/10);
    
    const w = fishImg.width * scale;
    const h = fishImg.height * scale;
    const x = 2*S - w/2;
    const y = 0.75*S - h/2;
    ctx.drawImage(fishImg, x, y, w, h);

    if (!completed) {
        let wantedImg = IMAGES.wanted;
        ctx.drawImage(wantedImg, 0, 0, 1*S, (1/3)*S);
    }

    return canvas.toBuffer();
}

module.exports.createCardCanvas = async function(card) {
    let FishData = api.fish.getFishData(card.fish);

    const S = 150;
    let canvas = createCanvas(S*4, S*1.5);
    ctx = canvas.getContext('2d');

    ctx.fillStyle = '#' + logic.color.STATIC[['trophy', 'sashimi', 'premium', 'consumer'][card.grade - 1]].toString(16);
    ctx.fillRect(0, 0, S*4, S*1.5);

    let fishImg = IMAGES.fish[card.fish];
    let scale = 0.8*4*S/fishImg.width; // scale to width (default)
    if (fishImg.width/fishImg.height < 8/3) { // scale to height if fish is less wide than 8:3 
        scale = 0.8*1.5*S/fishImg.height;
    }
    scale *= (TIER_SIZES[logic.text.rToTier(card.r)]/2 + 0.4) * Math.min(1, FishData.screenLen/8);
    
    const w = fishImg.width * scale;
    const h = fishImg.height * scale;
    const x = 2*S - w/2 + 0.1*S;
    const y = 0.75*S - h/2;
    await ctx.drawImage(fishImg, x, y, w, h);

    ctx.drawImage(IMAGES.tiers[logic.text.rToTier(card.r).toLowerCase()], S*0.1, S*0.1, S*0.6, S*0.6);

    return canvas.toBuffer();
}

module.exports.createClanBoatCanvas = async function(clan, status, clanAvatarID) {
    // Canvas for "clan boat" command
    const S = 150;
    let canvas = createCanvas(4*S, 3*S);
    let ctx = canvas.getContext('2d');

    // draw background
    let bgImg;
    if (status === 0 || status === 2) {
        bgImg = IMAGES['boat_docked'];
    } else if (status === 1) {
        bgImg = IMAGES.clanLocation[`${clan.boat_location}_fishing`];
    }
    ctx.drawImage(bgImg, 0, 0, 4*S, 3*S);
    // draw hull
    const hullImg = IMAGES.hull[clan.hull];
    ctx.drawImage(hullImg, 0.2*S, 1.05*S, 3.6*S, 0.9*S);
    // draw engine
    const engineImg = IMAGES.engine[clan.engine];
    ctx.drawImage(engineImg, 0.6*S, 1.25*S, 0.5*S, 0.5*S);
    // draw container
    const containerImg = IMAGES.container[clan.container];
    ctx.drawImage(containerImg, 0.8*S, 0.45*S, 1.8*S, 0.6*S);
    // draw propeller
    const propellerImg = IMAGES.propeller[clan.propeller];
    ctx.drawImage(propellerImg, 0.5*S, 1.95*S, 0.4*S, 0.4*S);
    // draw avatar
    if (clanAvatarID !== null) {
        const avatarImg = IMAGES.cosmetics.clan_avatar[clanAvatarID];
        ctx.drawImage(avatarImg, 1.4*S, 1.3*S, 0.4*S, 0.4*S);
    }

    return canvas.toBuffer();
}

module.exports.createEquipmentCanvas = async function(user, ringType, bannerID) {
    // Canvas For "equipment" Command
    const S = 300;
    let canvas = createCanvas(4*S, 3*S);
    let ctx = canvas.getContext('2d');

    // Step 1 - Get Data
    const LineData = api.equipment.getLineData(user.line);

    // Step 2 - Draw
    // Banner
    if (bannerID || bannerID === 0) {
        const bannerImg = IMAGES.cosmetics.equipment_banner[bannerID.toString()];
        ctx.drawImage(bannerImg, 0, 0, 4*S, 3*S);
    }
    // Line
    ctx.strokeStyle = LineData.rgb;
    ctx.lineWidth = S*0.005*LineData.px;
    ctx.moveTo(1*S, 0.4*S);
    ctx.lineTo(1*S, 2.5*S);
    ctx.stroke();
    // Rod, Hook
    const rodImg = IMAGES.rods[user.rod];
    ctx.drawImage(rodImg, 1*S, 0.4*S, 2.24*S, 1.68*S);
    const hookImg = IMAGES.hooks[user.hook];
    ctx.drawImage(hookImg, 0.92*S, 2.5*S, 0.16*S, 0.24*S);
    // Swivel, Gloves, Ring
    if (user.swivel !== 0) {
        const swivelImg = IMAGES.swivels[user.swivel];
        ctx.drawImage(swivelImg, 0.9*S, 1.8*S, 0.2*S, 0.3*S);
    }
    if (user.whale_swivel) {
        const whaleSwivelImg = IMAGES.whale_swivel;
        ctx.drawImage(whaleSwivelImg, 0.95*S, 1.6*S, 0.1*S, 0.15*S);
    }
    if (user.gloves !== 0) {
        const gloveImg = IMAGES.gloves[user.gloves];
        ctx.drawImage(gloveImg, 3.5*S, 0.05*S, 0.5*S, 0.5*S);
    }
    if (ringType) {
        const ringImg = IMAGES.rings[ringType];
        ctx.drawImage(ringImg, 3.1*S, 0.05*S, 0.4*S, 0.5*S);
    }

    return canvas.toBuffer();
}

module.exports.createFishingCanvasPre = async function(user, locationId, baitName, weatherId, generatedFish) {
    // Canvas for "fish" command (before button)
    const S = 200;
    let canvas = createCanvas(4*S, 3*S);
    let ctx = canvas.getContext('2d');

    let bgImg = IMAGES.locations.regular[locationId-1];
    ctx.drawImage(bgImg, 0, 0, 4*S, 3*S);

    for (const fish of generatedFish) {
        const fishImg = IMAGES.fish[fish.id];
        const imgWidth = Math.round(S * 0.12 * fish.screenLen * (0.6 + fish.r/2));
        const imgHeight = Math.round(imgWidth * (fishImg.height/fishImg.width));
        const x = fish.x * 4*S
        const y = fish.y * 3*S;
        ctx.save();
        ctx.translate(x + imgWidth/2, y + imgHeight/2);
        if (fish.flip) { ctx.scale(-1, 1); }
        ctx.rotate(fish.tilt * Math.PI / 180);
        ctx.drawImage(fishImg, -imgWidth/2, -imgHeight/2, imgWidth, imgHeight);
        ctx.restore();
    }

    // Weather Filter
    if (weatherId === 0) { // sunny
        ctx.drawImage(IMAGES.sun, 3.5*S, 0, 0.5*S, 0.5*S);
    } else if (weatherId === 1) { // partly sunny
        ctx.drawImage(IMAGES.sun, 3.5*S, 0, 0.5*S, 0.5*S);
        ctx.drawImage(IMAGES.cloud, 3.3*S, 0.08*S, 0.6*S, 0.4*S);
        ctx.drawImage(IMAGES.cloud, 3.7*S, 0.18*S, 0.45*S, 0.3*S);
    } else if (weatherId === 2) { // cloudy
        ctx.drawImage(IMAGES.cloud, 3.1*S, 0.1*S, 0.6*S, 0.4*S);
        ctx.drawImage(IMAGES.cloud, 3.5*S, 0.2*S, 0.45*S, 0.3*S);
    } else if (weatherId === 3) { // rainy
        ctx.fillStyle = '#66666644';
        ctx.fillRect(0, 0, 4*S, 3*S);
        ctx.drawImage(IMAGES.rain, 0, 0, 5*S, 1*S);
    } else if (weatherId === 4) { // storm
        ctx.fillStyle = '#22222266';
        ctx.fillRect(0, 0, 4*S, 3*S);
        ctx.drawImage(IMAGES.rain, 0, 0, 5*S, 1*S);
        ctx.drawImage(IMAGES.rain, -0.2*S, -0.2*S, 6*S, 1.2*S);
    }

    const scale = Math.min(api.equipment.getRodData(user.rod).size / api.fish.getLocationData(locationId).zoom, 1);

    let r = Math.random();
    const xHook = Math.max(Math.min(generatedFish[0].x * 4*S + 0.4*S*(r-0.5), 3.1*S), 0.1*S);
    const yHook = generatedFish[0].y * 3*S + 0.3*S*(r-0.5);
    // Draw rod
    let rodImg = IMAGES.rods[user.rod];
    ctx.drawImage(rodImg, xHook, 0.2*S, 0.8*S*scale, 0.6*S*scale);
    // Draw line
    const LineData = api.equipment.getLineData(user.line);
    ctx.strokeStyle = LineData.rgb;
    ctx.lineWidth = Math.min(S*0.005*LineData.px*scale, 4);
    ctx.moveTo(xHook, 0.2*S);
    ctx.lineTo(xHook, yHook);
    ctx.stroke();
    // Draw hook
    let hookImg = IMAGES.hooks[user.hook];
    ctx.drawImage(hookImg, xHook - 0.05*S*scale, yHook, 0.1*S*scale, 0.15*S*scale);
    // Draw swivel
    if (user.swivel) {
        const swivelImg = IMAGES.swivels[user.swivel];
        ctx.drawImage(swivelImg, xHook - 0.05*S*scale, 0.6*S, 0.1*S*scale, 0.15*S*scale);
    }
    // Draw swivel extension
    if (user.whale_swivel) {
        const whaleSwivelImg = IMAGES.whale_swivel;
        ctx.drawImage(whaleSwivelImg, xHook - 0.025*S*scale, 0.5*S, 0.05*S*scale, 0.075*S*scale);
    }
    // Draw bait
    if (baitName) {
        const baitImg = IMAGES.bait[baitName];
        ctx.drawImage(baitImg, xHook - 0.05*S*scale, yHook, 0.1*S*scale, 0.15*S*scale);
    }
    
    return canvas;
}

module.exports.createFishingCanvasPost = async function(oldCanvas, fish, lineSnapped, prestige) {
    // Canvas for "fish" command (after button)
    const S = 150;
    let canvas = createCanvas(8*S, 3*S);
    let ctx = canvas.getContext('2d');
    // background
    let backgroundImg = IMAGES[['caught_fish_bg', 'caught_fish_bg_purple'][prestige]];
    ctx.drawImage(backgroundImg, 0, 0, 8*S, 3*S);
    // border + old image snapshot
    ctx.fillStyle = '#000000';
    ctx.fillRect(0.18*S, 1.335*S, 2.04*S, 1.53*S);
    ctx.drawImage(oldCanvas, 0.2*S, 1.35*S, 2*S, 1.5*S);
    // circle caught fish
    const fishImg = IMAGES.fish[fish.id];
    const fishImgWidth = S * 0.12 * fish.screenLen * (0.6 + fish.r/2) / 2;
    const fishImgHeight = fishImgWidth * (fishImg.height/fishImg.width);
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 0.01*S;
    ctx.arc(0.2*S + 2*S*fish.x + fishImgWidth/2, 1.35*S + 1.5*S*fish.y + fishImgHeight/2, Math.max(fishImgWidth, fishImgHeight)*0.6, 0, 2*Math.PI);
    ctx.stroke();
    // tape strips
    ctx.drawImage(IMAGES.tape, 1.84*S, 1.2*S, 0.5*S, 0.5*S);
    ctx.drawImage(IMAGES.tape, 0.08*S, 2.46*S, 0.5*S, 0.5*S);
    ctx.save();
    ctx.translate(0.58*S, 1.2*S);
    ctx.scale(-1, 1);
    ctx.drawImage(IMAGES.tape, 0, 0, 0.5*S, 0.5*S);
    ctx.restore();
    ctx.save();
    ctx.translate(2.34*S, 2.46*S);
    ctx.scale(-1, 1);
    ctx.drawImage(IMAGES.tape, 0, 0, 0.5*S, 0.5*S);
    ctx.restore();
    // tier/fish snapped symbol
    if (lineSnapped) { ctx.drawImage(IMAGES.fish_escaped, 0.7*S, 0.15*S, 1*S, 1*S); }
    else { ctx.drawImage(IMAGES.tiers[fish.tier.toLowerCase()], 0.7*S, 0.15*S, 1*S, 1*S); }
    // fish display
    let scale = 2/3*8*S/fishImg.width; // scale to width, 66.6% (default)
    if (fishImg.width/fishImg.height < 2/1) { // scale to height if fish is less wide than 2:1 (drawable box)
        scale = 8/9*3*S/fishImg.height;
    }
    scale *= TIER_SIZES[fish.tier] * Math.min(1, fish.screenLen/10) / 1.1;
    const w = fishImg.width * scale;
    const h = fishImg.height * scale;
    const x = 31/48*8*S - w/2;
    const y = 0.5*3*S - h/2;
    ctx.drawImage(fishImg, x, y, w, h);

    return canvas.toBuffer();
}

module.exports.createTimeoutCanvas = async function(oldCanvas) {
    // Canvas for "fish" command (after button)
    const S = 150;
    let canvas = createCanvas(8*S, 3*S);
    let ctx = canvas.getContext('2d');
    // background
    ctx.drawImage(IMAGES.caught_fish_bg, 0, 0, 8*S, 3*S);
    // border + old image snapshot
    ctx.fillStyle = '#000000';
    ctx.fillRect(0.18*S, 1.335*S, 2.04*S, 1.53*S);
    ctx.drawImage(oldCanvas, 0.2*S, 1.35*S, 2*S, 1.5*S);
    // tape strips
    ctx.drawImage(IMAGES.tape, 1.84*S, 1.2*S, 0.5*S, 0.5*S);
    ctx.drawImage(IMAGES.tape, 0.08*S, 2.46*S, 0.5*S, 0.5*S);
    ctx.save();
    ctx.translate(0.58*S, 1.2*S);
    ctx.scale(-1, 1);
    ctx.drawImage(IMAGES.tape, 0, 0, 0.5*S, 0.5*S);
    ctx.restore();
    ctx.save();
    ctx.translate(2.34*S, 2.46*S);
    ctx.scale(-1, 1);
    ctx.drawImage(IMAGES.tape, 0, 0, 0.5*S, 0.5*S);
    ctx.restore();
    // tier/fish snapped symbol
    ctx.drawImage(IMAGES.timeout, 0.7*S, 0.15*S, 1*S, 1*S);

    return canvas.toBuffer();
}

module.exports.createLocationBackgroundCanvas = async function(locationId) {
    // Canvas for "location" command
    const S = 150;
    let canvas = createCanvas(4*S, 3*S);
    let ctx = canvas.getContext('2d');

    let bgImg = IMAGES.locations.regular[locationId-1];
    ctx.drawImage(bgImg, 0, 0, 4*S, 3*S);

    return canvas.toBuffer();
}

// ITEMS
module.exports.createItemAquariumCanvas = async function(aquariumId) {
    // Canvas for aquarium item
    const S = 150;
    let canvas = createCanvas(4*S, 3*S);
    let ctx = canvas.getContext('2d');

    let aquariumImg = IMAGES.aquarium[aquariumId];
    ctx.drawImage(aquariumImg, 0, 0, 4*S, 3*S);

    return canvas.toBuffer();
}

module.exports.createItemRingCanvas = async function(ringType) {
    // Canvas for ring item
    const jewel = api.equipment.getRingData(ringType).jewel;
    const S = 150;

    let canvas = createCanvas((jewel ? 2.8 : 2.4)*S, (jewel ? 2.5 : 2)*S);
    let ctx = canvas.getContext('2d');

    let ringImg = IMAGES.rings[ringType];
    ctx.drawImage(ringImg,
        0, jewel ? 0 : 64, // start at (sx, sy) of the original image
        256, 320-(jewel ? 0 : 64), // get (sw, sh) of pixels from the start point of the original image
        (jewel ? 0.4 : 0.2)*S, 0, // place at (dx, dy) on the canvas while accounting for padding
        2*S, (jewel ? 2.5 : 2)*S // stretch to (dw, dh) on the canvas
    );

    return canvas.toBuffer();
}

module.exports.createInfoCanvas = async function(itemType, itemId) {
    const S = 150;
    let canvas, jewel;
    if (itemType === 'fish') {
        canvas = createCanvas(4*S, 1.5*S);
    } else if (['ring'].includes(itemType)) {
        jewel = api.equipment.getRingData(itemId).jewel;
        canvas = createCanvas(2.4*S, 3*S);
    } else if (['glove', 'engine', 'propeller'].includes(itemType)) {
        canvas = createCanvas(4*S, 4*S);
    } else if (['line', 'hook', 'swivel'].includes(itemType)) {
        canvas = createCanvas(2*S, 3*S);
    } else if (['bait', 'aquarium', 'rod', 'clanLocation'].includes(itemType)) {
        canvas = createCanvas(4*S, 3*S);
    } else if (['chum_bait'].includes(itemType)) {
        canvas = createCanvas(2*S, 2*S);
    } else if (['hull'].includes(itemType)) {
        canvas = createCanvas(6*S, 1.5*S);
    } else if(['container'].includes(itemType)) {
        canvas = createCanvas(4.5*S, 1.5*S);
    }
    let ctx = canvas.getContext('2d');

    switch (itemType) {
        case 'fish':
            const FishData = api.fish.getFishData(itemId);
            ctx.drawImage(IMAGES.locations.aquarium[FishData.location - 1], 0, 0, 4*S, 3*S);
            let fishImg = IMAGES.fish[itemId];
            let scale = 0.9*4*S/fishImg.width; // scale to width (default)
            if (fishImg.width/fishImg.height < 8/3) { // scale to height if fish is less wide than 8:3 
                scale = 0.9*1.5*S/fishImg.height;
            }
            scale *= 0.7 * Math.min(1, (FishData.screenLen+2)/1.2/10);
            
            const w = fishImg.width * scale;
            const h = fishImg.height * scale;
            const x = 2*S - w/2;
            const y = 0.75*S - h/2;
            ctx.drawImage(fishImg, x, y, w, h);
            break;
        case 'bait':
            ctx.drawImage(IMAGES.bait.container, 1*S, 0, 2*S, 3*S);
            ctx.drawImage(IMAGES.bait[itemId], 1.5*S, 1.23*S, 1*S, 1.5*S); // itemId is string
            break;
        case 'chum_bait':
            //ctx.drawImage(IMAGES.bait.golden_container, 1*S, 0, 2*S, 3*S);
            ctx.drawImage(IMAGES.bait[itemId], 1/3*S, 0, 4/3*S, 2*S); // itemId is string
            break;
        case 'ring':
            ctx.drawImage(IMAGES.rings[itemId], // itemId is String
                0, jewel ? 0 : 64, // start at (sx, sy) of the original image
                256, 320-(jewel ? 0 : 64), // get (sw, sh) of pixels from the start point of the original image
                0.2*S, (jewel ? 0.25 : 0.5)*S, // place at (dx, dy) on the canvas while accounting for padding
                2*S, (jewel ? 2.5 : 2)*S // stretch to take up (dw, dh) on the canvas
            );
            break;
        case 'aquarium':
            ctx.drawImage(IMAGES.aquarium[itemId], 0, 0, 4*S, 3*S);                
            break;
        case 'rod':
            ctx.drawImage(IMAGES.rods[itemId], 0.4*S, 0.3*S, 3.2*S, 2.4*S);
            break;
        case 'line':
            const LineData = api.equipment.getLineData(itemId);
            // Draw Spool
            ctx.strokeStyle = '#ad8762';
            ctx.lineWidth = 0.3*S;
            ctx.beginPath();
            ctx.arc(1*S, 1*S, 0.32*S, 0, 2*Math.PI);
            ctx.stroke();
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 0.08*S;
            ctx.beginPath();
            ctx.arc(1*S, 1*S, 0.51*S, 0, 2*Math.PI);
            ctx.stroke();
            // Draw Lines
            ctx.strokeStyle = LineData.rgb;
            ctx.lineWidth = 0.12*S;
            ctx.beginPath();
            ctx.arc(1*S, 1*S, 0.61*S, 0, 2*Math.PI);
            ctx.stroke();
            ctx.lineWidth = LineData.px*0.014*S;
            ctx.moveTo(0.33*S + LineData.px*0.007*S, 1*S);
            ctx.lineTo(0.33*S + LineData.px*0.007*S, 2.7*S);
            ctx.stroke();
            break;
        case 'hook':
            ctx.drawImage(IMAGES.hooks[itemId], 0.2*S, 0.3*S, 1.6*S, 2.4*S);
            break;
        case 'glove':
            ctx.drawImage(IMAGES.gloves[itemId], 0.4*S, 0.4*S, 3.2*S, 3.2*S);
            break;
        case 'swivel':
            ctx.drawImage(IMAGES.swivels[itemId], 0.2*S, 0.3*S, 1.6*S, 2.4*S);
            break;
        case 'hull':
            ctx.drawImage(IMAGES.hull[itemId], 0.4*S, 0.1*S, 5.2*S, 1.3*S);
            break;
        case 'engine':
            ctx.drawImage(IMAGES.engine[itemId], 0.4*S, 0.4*S, 3.2*S, 3.2*S);
            break;
        case 'container':
            ctx.drawImage(IMAGES.container[itemId], 0.3*S, 0.1*S, 3.9*S, 1.3*S);
            break;
        case 'propeller':
            ctx.drawImage(IMAGES.propeller[itemId], 0.4*S, 0.4*S, 3.2*S, 3.2*S);
            break;
        case 'clanLocation':
            ctx.drawImage(IMAGES.clanLocation[itemId], 0, 0, 4*S, 3*S);
            break;
        default:
            break;
    }

    return canvas.toBuffer();
}

module.exports.createItemUpgradeCanvas = async function(itemType, itemId) { // itemId of the old item
    // Canvas for "buy {equipment}" command
    const S = 150;
    let canvas;
    if (itemType === 'gloves') { canvas = createCanvas(4*S, 2*S); }
    else if (['line', 'hook', 'swivel', 'extension'].includes(itemType)) { canvas = createCanvas(4*S, 3*S); }
    else { canvas = createCanvas(4*S, 1.5*S); }
    let ctx = canvas.getContext('2d');

    switch (itemType) {
        case 'gloves':
            if (itemId === 0) {
                ctx.drawImage(IMAGES.gloves['1'], 1*S, 0, 2*S, 2*S);
            } else {
                ctx.drawImage(IMAGES.gloves[itemId], 0, 0, 2*S, 2*S);
                ctx.drawImage(IMAGES.gloves[itemId + 1], 2*S, 0, 2*S, 2*S);
            }
            break;
        case 'line':
            const LineData1 = api.equipment.getLineData(itemId);
            const LineData2 = api.equipment.getLineData(itemId + 1);
            // Draw Spools
            ctx.strokeStyle = '#ad8762';
            ctx.lineWidth = 0.3*S;
            ctx.beginPath();
            ctx.arc(1*S, 1*S, 0.32*S, 0, 2*Math.PI);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(3*S, 1*S, 0.32*S, 0, 2*Math.PI);
            ctx.stroke();

            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 0.08*S;
            ctx.beginPath();
            ctx.arc(1*S, 1*S, 0.51*S, 0, 2*Math.PI);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(3*S, 1*S, 0.51*S, 0, 2*Math.PI);
            ctx.stroke();

            // Draw Lines
            ctx.strokeStyle = LineData1.rgb;
            ctx.lineWidth = 0.12*S;
            ctx.beginPath();
            ctx.arc(1*S, 1*S, 0.61*S, 0, 2*Math.PI);
            ctx.stroke();
            ctx.lineWidth = LineData1.px*0.014*S;
            ctx.moveTo(0.33*S + LineData1.px*0.007*S, 1*S);
            ctx.lineTo(0.33*S + LineData1.px*0.007*S, 2.7*S);
            ctx.stroke();

            ctx.strokeStyle = LineData2.rgb;
            ctx.lineWidth = 0.12*S;
            ctx.beginPath();
            ctx.arc(3*S, 1*S, 0.61*S, 0, 2*Math.PI);
            ctx.stroke();
            ctx.lineWidth = LineData2.px*0.014*S;
            ctx.moveTo(2.33*S + LineData2.px*0.007*S, 1*S);
            ctx.lineTo(2.33*S + LineData2.px*0.007*S, 2.7*S);
            ctx.stroke();
            break;
        case 'hook':
            ctx.drawImage(IMAGES.hooks[itemId], 0, 0, 2*S, 3*S);
            ctx.drawImage(IMAGES.hooks[itemId + 1], 2*S, 0, 2*S, 3*S);
            break;
        case 'swivel':
            if (itemId === 0) {
                ctx.drawImage(IMAGES.swivels['1'], 1*S, 0, 2*S, 3*S);
            } else {
                ctx.drawImage(IMAGES.swivels[itemId], 0, 0, 2*S, 3*S);
                ctx.drawImage(IMAGES.swivels[itemId + 1], 2*S, 0, 2*S, 3*S);
            }
            break;
        case 'extension':
            ctx.drawImage(IMAGES.whale_swivel, 1*S, 0, 2*S, 3*S);
            break;
        case 'aquarium':
            ctx.drawImage(IMAGES.aquarium[itemId], 0.1*S, 0.075*S, 1.8*S, 1.35*S);
            ctx.drawImage(IMAGES.aquarium[itemId + 1], 2.1*S, 0.075*S, 1.8*S, 1.35*S);
            break;
        case 'rod':
            ctx.drawImage(IMAGES.rods[itemId], 0.1*S, 0.075*S, 1.8*S, 1.35*S);
            ctx.drawImage(IMAGES.rods[itemId + 1], 2.1*S, 0.075*S, 1.8*S, 1.35*S);
            break;
        default:
            break;
    }

    return canvas.toBuffer();
}

module.exports.createSkinCanvas = async function(category, id) {
    // Canvas for "skin" Command
    const S = 300;
    let cW, cH, W, H;

    switch (category) {
        case 'equipment_banner':
            cW = 4*S;
            cH = 3*S;
            W = 4*S;
            H = 3*S;
            break;
        case 'clan_avatar':
            cW = 512;
            cH = 256;
            W = 256;
            H = 256;
            break;
        default:
            break;
    }

    let canvas = createCanvas(cW, cH);
    let ctx = canvas.getContext('2d');

    ctx.drawImage(IMAGES.cosmetics[category][id], Math.floor((cW - W)/2), Math.floor((cH - H)/2), W, H);

    return canvas.toBuffer();
}

module.exports.createSkinHelpCanvas = async function() {
    // Canvas for "help skin" Command
    let canvas = createCanvas(360, 90);
    ctx = canvas.getContext('2d');

    ctx.drawImage(IMAGES.cosmetics.equipment_banner['0'], 0, 0, 120, 90);
    ctx.drawImage(IMAGES.cosmetics.equipment_banner['1'], 120, 0, 120, 90);
    ctx.drawImage(IMAGES.cosmetics.equipment_banner['2'], 240, 0, 120, 90);

    return canvas.toBuffer();
}

module.exports.createChumCanvas = async function(bait) {
    // Canvas for "chum" command
    let canvas = createCanvas(400, 400);
    ctx = canvas.getContext('2d');

    ctx.drawImage(IMAGES.bait[bait], 0, -50, 200, 300);
    ctx.drawImage(IMAGES.bait[bait], 200, -50, 200, 300);
    ctx.drawImage(IMAGES.bait[bait], 0, 150, 200, 300);
    ctx.drawImage(IMAGES.bait[bait], 200, 150, 200, 300);
    
    return canvas.toBuffer();
}