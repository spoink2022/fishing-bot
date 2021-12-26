// Handle All Canvas Aspects of Big Tuna
// # --------------------------------- #

const { createCanvas } = require('canvas');

const api = require('../../api');

module.exports.createEquipmentCanvas = async function(user, ringType, bannerID) {
    // Canvas For "equipment" Command
    const S = 150;
    let canvas = createCanvas(4*S, 3*S);
    let ctx = canvas.getContext('2d');

    // Step 1 - Get Data
    const lineData = api.equipment.getLineData(user.line);
    const ringHasJewel = ringType ? api.equipment.getRingData(ringType).jewel : null;

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
    if (user.glove !== 0) {
        const gloveImg = IMAGES.gloves[user.glove];
        ctx.drawImage(gloveImg, 3.5*S, 0.05*S, 0.5*S, 0.5*S);
    }
    if (ringType) {
        const ringImg = IMAGES.rings[ringType];
        ctx.drawImage(ringImg,
            0, ringHasJewel ? 0 : 64, // start at (sx, sy) of the original image
            256, 320-(ringHasJewel ? 0 : 64), // get (sw, sh) of pixels from the start point of the original image
            3.1*S, 0.05*S + (ringHasJewel ? 0 : 0.1*S), // place at (dx, dy) on the canvas while accounting for padding
            0.4*S, 0.4*S + (ringHasJewel ? 0.1*S : 0) // stretch to (dw, dh) on the canvas
        );
    }

    return canvas.toBuffer();
}