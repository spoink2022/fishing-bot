const { createCanvas, loadImage } = require('canvas');

const api  = require('../../api');

const S = 300;
const W = 4 * S;
const H = 3 * S;

module.exports.createCanvasForFishing = async function(locationID, possibleFish) {
    let canvas = createCanvas(W, H);
    let ctx = canvas.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);

    let bgImg = await loadImage(api.images.fetchLocationImgUrl(locationID));
    ctx.drawImage(bgImg, 0, 0, W, H);

    // Draw fishies
    for(let fish of possibleFish) {
        if(fish.id != -1) {
            let fishImg = await loadImage(api.images.fetchFishImgUrl(fish.id, fish.imgNum));
            let imgWidth = (S/10)*fish.screenLen;
            let imgHeight = imgWidth*(fishImg.height/fishImg.width)
            ctx.save();
            ctx.translate(fish.x*W + imgWidth/2, fish.y*H + imgHeight/2);
            if(fish.flip) { ctx.scale(-1, 1); }
            ctx.rotate(fish.tilt * Math.PI / 180);
            ctx.drawImage(fishImg, -imgWidth/2, -imgHeight/2, imgWidth, imgHeight);
            ctx.restore();

            /*ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 10;
            ctx.arc(fish.x*W + imgWidth/2, fish.y*H + imgHeight/2, imgWidth*0.6, 0, Math.PI * 2);
            ctx.stroke();*/
        }
    }
    // Draw rod
    let rodOffset = 0.1 + Math.random()*0.6;
    let rodImg = await loadImage(api.images.fetchRodImgUrl(0, 0));
    ctx.drawImage(rodImg, W*rodOffset, H*0.05, W/4, H/4);
    // Draw line
    let lineData = api.fishing.getLineData(0);
    let hookDepth = 0.5;
    console.log(lineData.rgb);
    ctx.strokeStyle = lineData.rgb;
    ctx.lineWidth = lineData.px;
    ctx.moveTo(W*rodOffset, H*0.05);
    ctx.lineTo(W*rodOffset, H*hookDepth);
    ctx.stroke();

    return canvas.toBuffer();
}