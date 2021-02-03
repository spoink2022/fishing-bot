const { createCanvas, loadImage } = require('canvas');

const api  = require('../../api');

const S = 300;
const W = 4 * S;
const H = 3 * S;

module.exports.createCanvasForFishing = async function(locationID, possibleFish) {
    console.log(locationID, possibleFish);
    let canvas = createCanvas(W, H);
    let ctx = canvas.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);

    let bgImg = await loadImage(api.images.fetchLocationImgUrl(locationID));
    ctx.drawImage(bgImg, 0, 0, W, H);

    return canvas.toBuffer();
}