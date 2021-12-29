// Handle All Canvas Aspects of Big Tuna
// # --------------------------------- #

const { createCanvas } = require('canvas');

const api = require('../../api');

module.exports.createAquariumCanvas = async function(user, locationId, FishValues, FishData) {
    // Canvas for "aquarium" command
    const S = 150;
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

module.exports.createEquipmentCanvas = async function(user, ringType, bannerID) {
    // Canvas For "equipment" Command
    const S = 150;
    let canvas = createCanvas(4*S, 3*S);
    let ctx = canvas.getContext('2d');

    // Step 1 - Get Data
    const lineData = api.equipment.getLineData(user.line);

    // Step 2 - Draw
    // Banner
    if (bannerID || bannerID === 0) {
        const bannerImg = IMAGES.cosmetics.equipment_banner[bannerID.toString()];
        ctx.drawImage(bannerImg, 0, 0, 4*S, 3*S);
    }
    // Line
    ctx.strokeStyle = lineData.rgb;
    ctx.lineWidth = lineData.px/2;
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

module.exports.createItemUpgradeCanvas = async function(itemType, itemId) { // itemId of the old item
    // Canvas for "buy {equipment}" command
    const S = 150;
    let canvas;

    if (itemType === 'gloves') { canvas = createCanvas(4*S, 2*S); }
    else if (['line', 'hook', 'swivel'].includes(itemType)) { canvas = createCanvas(4*S, 3*S); }
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