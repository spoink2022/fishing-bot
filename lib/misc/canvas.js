const { createCanvas, loadImage } = require('canvas');

const api  = require('../../api');

const S = 300;
const W = 4 * S;
const H = 3 * S;

module.exports.createCanvasForFishingPre = async function(locationID, possibleFish) {
    let canvas = createCanvas(W, H);
    let ctx = canvas.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);

    let bgImg = await loadImage(api.images.fetchLocationImgUrl(locationID));
    ctx.drawImage(bgImg, 0, 0, W, H);

    // Draw fishies
    let firstFish = true;
    for(let fish of possibleFish) {
        let fishImg = await loadImage(api.images.fetchFishImgUrl(fish.id, fish.imgNum));
        let imgWidth = (S/10)*fish.screenLen;
        let imgHeight = imgWidth*(fishImg.height/fishImg.width)
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
    let rodOffset = 0.1 + Math.random()*0.6;
    let rodImg = await loadImage(api.images.fetchRodImgUrl(0, 0));
    ctx.drawImage(rodImg, W*rodOffset, H*0.05, W/4, H/4);
    // Draw line
    let lineData = api.fishing.getLineData(0);
    let hookDepth = 0.4 + Math.random()*0.5;
    console.log(lineData.rgb);
    ctx.strokeStyle = lineData.rgb;
    ctx.lineWidth = lineData.px;
    ctx.moveTo(W*rodOffset, H*0.05);
    ctx.lineTo(W*rodOffset, H*hookDepth);
    ctx.stroke();
    // Draw hook (300x400)
    let hookImg = await loadImage(api.images.fetchHookImgUrl(0));
    ctx.drawImage(hookImg, rodOffset*W-S/16, H*hookDepth, S/8, S/6);

    // get coordinates of center of chosen fish (first fish in list)

    return [canvas, centerCoords];
}

module.exports.createCanvasForFishingPost = async function(locationID, oldCanvas, fish) {
    let canvas = createCanvas(W*2, H);
    let ctx = canvas.getContext('2d');

    // draw tmp bg
    ctx.fillStyle = '#bbbbbb';
    ctx.fillRect(0, 0, W*2, H);

    // border + old image snapshot
    ctx.fillStyle = '#000000';
    ctx.fillRect(W*0.045, H*0.445, W*0.51, H*0.51);
    ctx.drawImage(oldCanvas, W*0.05, H*0.45, W/2, H/2);
    // draw tape images (4)
    await drawFourTapeStrips(ctx);
    // circle the previous fish
    let fishWidth = (S/10)*fish.screenLen;
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 5;
    ctx.arc(W*0.05 + fish.centerCoords[0]/2, H*0.45 + fish.centerCoords[1]/2, fishWidth*0.3, 0, 2*Math.PI);
    ctx.stroke();

    return canvas.toBuffer();
}

async function drawFourTapeStrips(ctx) {
    console.log(IMAGES.tapeStrip);
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