const { createCanvas, loadImage } = require('canvas');
const e = require('express');

const api = require('../../api');
const gameLogic = require('./game_logic.js');

const S = 300;
const W = 4 * S;
const H = 3 * S;
const tierMultipliers = {'ss': 1.1, 's': 1, 'a': 0.9, 'b': 0.8, 'c': 0.7, 'd': 0.6, 'f': 0.8};

module.exports.createCanvasForFishingPre = async function(user, possibleFish, sizeAdjustment=1, rodSize, bait, weatherNum) {
    let canvas = createCanvas(W, H);
    let ctx = canvas.getContext('2d');

    let bgImg = IMAGES.bg[user.location.toString()];
    ctx.drawImage(bgImg, 0, 0, W, H);

    // Draw fishies
    let firstFish = true;
    for(let fish of possibleFish) {
        let fishImg = IMAGES.fish[fish.id.toString()];
        let imgWidth = (S/10)*fish.screenLen;
        let imgHeight = imgWidth*(fishImg.height/fishImg.width);
        ctx.save();
        ctx.translate(fish.x*W + imgWidth/2, fish.y*H + imgHeight/2);
        if(fish.flip) { ctx.scale(-1, 1); }
        ctx.rotate(fish.tilt * Math.PI / 180);
        ctx.drawImage(fishImg, -imgWidth/2, -imgHeight/2, imgWidth, imgHeight);
        ctx.restore();
        if(firstFish) { // this is the chosen fish
            var centerCoords = [fish.x*W + imgWidth/2, fish.y*H + imgHeight/2];
            firstFish = false;
        }
        /*ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 10;
        ctx.arc(fish.x*W + imgWidth/2, fish.y*H + imgHeight/2, imgWidth*0.6, 0, Math.PI * 2);
        ctx.stroke();*/
    }
    // Draw weather filter
    if (weatherNum === 0) { // sunny
        ctx.drawImage(IMAGES.sun, W-190, -10, 200, 200);
    } else if (weatherNum === 1) { // partly sunny

    } else if (weatherNum === 2) { // cloudy
        ctx.fillStyle = '#99999944';
        ctx.fillRect(0, 0, W, H);
    } else if (weatherNum === 3) { // rainy
        ctx.fillStyle = '#66666655';
        ctx.fillRect(0, 0, W, H);
        ctx.drawImage(IMAGES.rain, 0, 0, W*1.2, H*0.33);
    } else if (weatherNum === 4) { // storm
        ctx.fillStyle = '#22222266';
        ctx.fillRect(0, 0, W, H);
        ctx.drawImage(IMAGES.rain, 0, 0, W*1.2, H*0.33);
        ctx.drawImage(IMAGES.rain, W*-0.2, 0, W*1.5, H*0.2);
    }

    // Draw rod (400x300)
    let rodOffset = Math.max(possibleFish[0].x + Math.random()*0.3 - 0.15, 0.1);
    let rodImg = IMAGES.rods[user.rod.toString()];
    let rodScale = Math.min(1, rodSize/sizeAdjustment);
    ctx.drawImage(rodImg, W*rodOffset, H*0.05, W/4*rodScale, H/4*rodScale);
    // Draw line
    let lineData = api.fishing.getLineData(user.line);
    let hookDepth = Math.max(possibleFish[0].y + Math.random()*0.3-0.15, 0.4);
    ctx.strokeStyle = lineData.rgb;
    ctx.lineWidth = lineData.px/sizeAdjustment;
    ctx.moveTo(W*rodOffset, H*0.05);
    ctx.lineTo(W*rodOffset, H*hookDepth);
    ctx.stroke();
    // Draw hook (300x400)
    let hookImg = IMAGES.hooks[user.hook.toString()];
    ctx.drawImage(hookImg, rodOffset*W-S/12/sizeAdjustment, H*hookDepth, S/6/sizeAdjustment, S/4.5/sizeAdjustment);
    // Draw swivel (if any)
    if (user.swivel !== 0) {
        let swivelImg = IMAGES.swivels[user.swivel];
        ctx.drawImage(swivelImg, rodOffset*W-S/16, H*0.2, S/8, S/6);
    }
    // Draw bait (if any)
    if (bait) {
        let baitImg = IMAGES.bait[bait];
        ctx.drawImage(baitImg, rodOffset*W-S/12/sizeAdjustment/2, H*hookDepth-S/12/sizeAdjustment*0, S/12/sizeAdjustment, S/9/sizeAdjustment);
    }

    return [canvas, centerCoords];
}

module.exports.createCanvasForFishingPost = async function(locationID, oldCanvas, fish, lineSnapped, zoom) {
    let canvas = createCanvas(W*2, H);
    let ctx = canvas.getContext('2d');

    // draw bg
    ctx.drawImage(IMAGES.caught_fish_bg, 0, 0, W*2, H);

    // border + old image snapshot
    ctx.fillStyle = '#000000';
    ctx.fillRect(W*0.045, H*0.445, W*0.51, H*0.51);
    ctx.drawImage(oldCanvas, W*0.05, H*0.45, W/2, H/2);
    // draw tape images (4)
    await drawFourTapeStrips(ctx);
    // circle the previous fish
    let fishWidth = (S/10)*fish.screenLen;
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = S/60;
    ctx.arc(W*0.05 + fish.centerCoords[0]/2, H*0.45 + fish.centerCoords[1]/2, fishWidth*0.3, 0, 2*Math.PI);
    ctx.stroke();

    // draw fish_escaped/tier symbol
    if(lineSnapped) {
        ctx.drawImage(IMAGES.fish_escaped, W*0.175, H*0.05, S, S);
    } else {
        ctx.drawImage(IMAGES.tiers[fish.tier], W*0.175, H*0.05, S, S);
    }
    // draw display of fish (bounding-box: ctx.fillRect(W*0.7, H*0.1, W*1.2, H*0.8); )
    let fishImg = IMAGES.fish[fish.id.toString()];
    if(fishImg.width/fishImg.height > W*1.2/H*0.8) { // fish is wider than area (scale to width)
        var scale = W*1.2/fishImg.width;
    } else { // fish is taller than area (scale to height)
        var scale = H*0.8/fishImg.height;
    }
    scale = scale * tierMultipliers[fish.tier] * Math.min(1, fish.originalScreenLen/10 * Math.max(1, zoom/1.5));
    let fishImgVals = {'w': fishImg.width * scale, 'h': fishImg.height * scale};
    fishImgVals.x = W*0.7+(W*1.2-fishImgVals.w)/2;
    fishImgVals.y = H*0.1+(H*0.8-fishImgVals.h)/2;
    ctx.drawImage(fishImg, fishImgVals.x, fishImgVals.y, fishImgVals.w, fishImgVals.h);
    return canvas.toBuffer();
}

module.exports.createCanvasForAquarium = async function(locationID, aquariumFilter, fishContents) {
    let canvas = createCanvas(W, H);
    let ctx = canvas.getContext('2d');

    let bgImg = IMAGES.bg[locationID + '_aq'];
    ctx.drawImage(bgImg, 0, 0, W, H);
    for(const fish of Object.values(fishContents)) {
        if(!fish) { continue; }
        let fishImg = IMAGES.fish[fish.id.toString()];
        let t = await gameLogic.generateAquariumFishTransformations();
        let imgWidth = (S/10)*fish.screenLen;
        let imgHeight = imgWidth*(fishImg.height/fishImg.width);
        ctx.save();
        ctx.translate(t.x*W + imgWidth/2, t.y*H + imgHeight/2);
        if(t.flip) { ctx.scale(-1, 1); }
        ctx.rotate(t.tilt * Math.PI / 180);
        ctx.drawImage(fishImg, -imgWidth/2, -imgHeight/2, imgWidth, imgHeight);
        ctx.restore();
    }
   
    let aquariumFilterImg = IMAGES.aquarium[aquariumFilter];
    ctx.drawImage(aquariumFilterImg, 0, 0, W, H);

    return canvas.toBuffer();
}

async function drawFourTapeStrips(ctx) {
    let tapeImg = IMAGES.tapeStrip;
    ctx.drawImage(tapeImg, W*0.46, H*0.4, S/2, S/2);
    ctx.drawImage(tapeImg, W*0.02, H*0.82, S/2, S/2);
    ctx.save();
    ctx.translate(W*0.145, H*0.4);
    ctx.scale(-1, 1);
    ctx.drawImage(tapeImg, 0, 0, S/2, S/2);
    ctx.restore();
    ctx.save();
    ctx.translate(W*0.585, H*0.82);
    ctx.scale(-1, 1);
    ctx.drawImage(tapeImg, 0, 0, S/2, S/2);
    ctx.restore();
    return;
}

module.exports.createCanvasForEquipment = async function(rodID, lineID, hookID, gloveID, swivelID) {
    let canvas = createCanvas(W/2, H/2);
    let ctx = canvas.getContext('2d');

    const rodImg = IMAGES.rods[rodID];
    ctx.drawImage(rodImg, W*0.125, H*0.05, W*0.28, H*0.28);

    const lineData = api.fishing.getLineData(lineID);
    ctx.strokeStyle = lineData.rgb;
    ctx.lineWidth = lineData.px/2;
    ctx.moveTo(W*0.125, H*0.05);
    ctx.lineTo(W*0.125, H*0.4);
    ctx.stroke();

    const hookImg = IMAGES.hooks[hookID];
    ctx.drawImage(hookImg, W*0.125-S/24, H*0.4, S/12, S/9);

    if (gloveID !== 0) {
        const gloveImg = IMAGES.gloves[gloveID];
        ctx.drawImage(gloveImg, W/2-S/4, 0, S/4, S/4);
    }
    if (swivelID !== 0) {
        const swivelImg = IMAGES.swivels[swivelID];
        ctx.drawImage(swivelImg, W*0.125-S/18, H*0.3, S/9, S/6);
    }

    return canvas.toBuffer();
}

module.exports.createItemShowcaseCanvas = async function(img, width, height) {
    let canvas = createCanvas(W*width, H*height);
    let ctx = canvas.getContext('2d');

    ctx.drawImage(img, W*width*0.1, H*height*0.1, W*width*0.8, H*height*0.8);

    return canvas.toBuffer();
}

module.exports.createCroppedItemShowcaseCanvas = async function(img, sx, sy, sw, sh, dx, dy, dw, dh, padding=true) {
    let padX = 0, padY = 0;
    if (padding) {
        padX = Math.round(dw * 0.1);
        padY = Math.round(dh * 0.1);
    }
    console.log(padX, padY);
    let canvas = createCanvas(dw+padX*2, dh+padY*2); // destination width, destination height
    let ctx = canvas.getContext('2d');

    ctx.drawImage(img,
        sx, sy, // start at (sx, sy) of the original image
        sw, sh, // get (sw, sh) of pixels from the start point of the original image
        dx+padX, dy+padY, // place at (dx, dy) on the canvas while accounting for padding
        dw, dh // stretch to (dw, dh) on the canvas
    );

    return canvas.toBuffer();
}

module.exports.createLineShowcaseCanvas = async function(hex, thickness) {
    let canvas = createCanvas(W/4, H/2);
    let ctx = canvas.getContext('2d');
    // draw the spool
    ctx.strokeStyle = '#ad8762';
    ctx.lineWidth = 45;
    ctx.beginPath();
    ctx.arc(W/8, H*0.15, W*0.048, 0, 2*Math.PI);
    ctx.stroke();

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(W/8, H*0.15, W*0.07, 0, 2*Math.PI);
    ctx.stroke();

    // draw the line
    ctx.strokeStyle = hex;
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.arc(W/8, H*0.15, W*0.08, 0, 2*Math.PI);
    ctx.stroke();

    ctx.lineWidth = thickness * 2;
    ctx.moveTo(W*0.0399 + thickness, H*0.15);
    ctx.lineTo(W*0.0399 + thickness, H*0.45);
    ctx.stroke();

    return canvas.toBuffer();
}

module.exports.createFishShowcaseCanvas = async function(fishImg, screenLen, zoom) {
    let canvas = createCanvas(W/2, H/4);
    let ctx = canvas.getContext('2d');

    let bgImg = IMAGES.caught_fish_bg;
    ctx.drawImage(bgImg, 0, 0, W/2, H/4);

    if(fishImg.width/fishImg.height > W/(H/2)) { // fish is wider than area (scale to width)
        var scale = W/2/fishImg.width;
    } else { // fish is taller than area (scale to height)
        var scale = H/4/fishImg.height;
    }
    scale *= Math.min(1, 0.25 + (screenLen/20)*3/4);
    let x = (W/4-fishImg.width*scale/2), y = (H/8-fishImg.height*scale/2);
    ctx.drawImage(fishImg, x, y, fishImg.width*scale, fishImg.height*scale);

    return canvas.toBuffer();
}

module.exports.createBaitShowcaseCanvas = async function(containerImg, baitImg) {
    let canvas = createCanvas(W/2, H/2);
    ctx = canvas.getContext('2d');

    ctx.drawImage(containerImg, W/8, 0, W/4, H/2);
    ctx.drawImage(baitImg, W*0.1875, H*0.205, W/8, H/4);

    return canvas.toBuffer();
}

module.exports.createBackgroundShowcaseCanvas = async function(bgImg) {
    let canvas = createCanvas(W, H);
    let ctx = canvas.getContext('2d');

    ctx.drawImage(bgImg, 0, 0, W, H);

    return canvas.toBuffer();
}

module.exports.createCanvasForBounty = async function(bounty, fishInfo, completed) {
    let canvas = createCanvas(W, H/2);
    ctx = canvas.getContext('2d');
    
    let bgImg = completed ? IMAGES.caught_fish_bg_green : IMAGES.caught_fish_bg_red;
    ctx.drawImage(bgImg, 0, 0, W, H/2);

    let fishImg = IMAGES.fish[fishInfo.id.toString()];
    
    if(fishImg.width/fishImg.height > W*1.2/H*0.8) { // fish is wider than area (scale to width)
        var scale = W*0.8/fishImg.width;
    } else { // fish is taller than area (scale to height)
        var scale = H*0.4/fishImg.height;
    }
    scale = scale * tierMultipliers[bounty.tier.toLowerCase()] * Math.min(1, fishInfo.screenLen/10);
    let fishImgVals = {'w': fishImg.width * scale, 'h': fishImg.height * scale};
    fishImgVals.x = W*0.1+(W*0.8-fishImgVals.w)/2;
    fishImgVals.y = H*0.05+(H*0.4-fishImgVals.h)/2;
    ctx.drawImage(fishImg, fishImgVals.x, fishImgVals.y, fishImgVals.w, fishImgVals.h);

    if (!completed) {
        let wantedImg = IMAGES.wanted;
        ctx.translate(W/2-S, H/4-S/3+S/5);
        ctx.rotate(31*Math.PI/16);
        ctx.drawImage(wantedImg, 0, 0, S*2, S*2/3);
    }

    return canvas.toBuffer();
}

module.exports.createCardCanvas = async function(card, grade) {
    let fishInfo = api.fishing.getFishData(card.fish);

    let canvas = createCanvas(W*0.5, H*0.25);
    ctx = canvas.getContext('2d');

    ctx.fillStyle = api.visuals.getColor('card', grade);
    ctx.fillRect(0, 0, W*1.5, H);

    //ctx.fillStyle = '#555555';
    //ctx.fillRect(W*0.1, H*0.025, W*0.375, H*0.2);

    let fishImg = IMAGES.fish[card.fish];
    if (fishImg.width/fishImg.height > (W*0.5) / (H*0.25)) {
        var scale = W*0.375 / fishImg.width;
    } else {
        var scale = H*0.2 / fishImg.height;
    }
    scale *= (0.7 + card.r*0.3/1.2) * (0.4 + Math.min(fishInfo.screenLen, 10)*0.6/10);
    let w = fishImg.width * scale;
    let h = fishImg.height * scale;
    let x = W*0.1 + (W*0.375 - w)/2;
    let y = H*0.025 + (H*0.2 - h)/2;
    ctx.drawImage(fishImg, x, y, w, h);

    ctx.drawImage(IMAGES.tiers[gameLogic.getTier(card.r)], S*0.05, S*0.05, S*0.3, S*0.3);

    return canvas.toBuffer();
}