const { createCanvas } = require('canvas');

const S = 300;
const W = 4 * S;
const H = 3 * S;

module.exports.createCanvasForFishing = async function(locationID, possibleFish) {
    console.log(locationID, possibleFish);
    let canvas = createCanvas(W, H);
    let ctx = canvas.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);

    return canvas.toBuffer();
}