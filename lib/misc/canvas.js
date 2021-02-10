const { createCanvas, loadImage } = require('canvas');

const api = require('../../api');
const gameLogic = require('./game_logic.js');

const S = 300;
const W = 4 * S;
const H = 3 * S;
const tierMultipliers = {'ss': 1.1, 's': 1, 'a': 0.9, 'b': 0.8, 'c': 0.7, 'd': 0.6, 'f': 0.8};

module.exports.createCanvasForFishingPre = async function(user, possibleFish) {
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
    // Draw rod (400x300)
    let rodOffset = Math.max(possibleFish[0].x + possibleFish[0].screenLen/S*4 + Math.random()*0.2-0.2, 0.1);
    let rodImg = IMAGES.rods[user.rod.toString()];
    ctx.drawImage(rodImg, W*rodOffset, H*0.05, W/4, H/4);
    // Draw line
    let lineData = api.fishing.getLineData(user.line);
    let hookDepth = Math.max(possibleFish[0].y + Math.random()*0.2-0.2, 0.4);
    ctx.strokeStyle = lineData.rgb;
    ctx.lineWidth = lineData.px;
    ctx.moveTo(W*rodOffset, H*0.05);
    ctx.lineTo(W*rodOffset, H*hookDepth);
    ctx.stroke();
    // Draw hook (300x400)
    let hookImg = IMAGES.hooks[user.hook.toString()];
    ctx.drawImage(hookImg, rodOffset*W-S/12, H*hookDepth, S/6, S/4.5);

    return [canvas, centerCoords];
}

module.exports.createCanvasForFishingPost = async function(locationID, oldCanvas, fish, lineSnapped) {
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
    scale = scale * tierMultipliers[fish.tier] * Math.min(1, fish.originalScreenLen/10);
    let fishImgVals = {'w': fishImg.width * scale, 'h': fishImg.height * scale};
    fishImgVals.x = W*0.7+(W*1.2-fishImgVals.w)/2;
    fishImgVals.y = H*0.1+(H*0.8-fishImgVals.h)/2;
    ctx.drawImage(fishImg, fishImgVals.x, fishImgVals.y, fishImgVals.w, fishImgVals.h);
    return canvas.toBuffer();
}

module.exports.createCanvasForAquarium = async function(locationID, aquariumLevel, fishContents) {
    let canvas = createCanvas(W, H);
    let ctx = canvas.getContext('2d');

    let bgImg = IMAGES.bg[`${locationID}_aq`];
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
   
    let aquariumName = api.gamedata.getAquariumInfo(aquariumLevel).name;
    let aquariumFilter = IMAGES.aquarium[aquariumName];
    ctx.drawImage(aquariumFilter, 0, 0, W, H);

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

module.exports.createCanvasForEquipment = async function(rodID, lineID, hookID) {
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

    return canvas.toBuffer();
}

module.exports.createItemShowcaseCanvas = async function(img, width, height) {
    let canvas = createCanvas(W*width, H*height);
    let ctx = canvas.getContext('2d');

    ctx.drawImage(img, W*width*0.1, H*height*0.1, W*width*0.8, H*height*0.8);

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