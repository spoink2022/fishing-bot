const api = require('../api');
const db = require('../db');

const { calculateFisherScore } = require('../lib/misc/calculations.js');

async function recalculate() {
    const AllAquariumData = await db.aquarium.getAllData();
    const LocationFishData = [];
    for (let i=1; i<=13; i++) {
        LocationFishData.push(api.fish.getFishDataFromLocation(i));
    }
    let increment = 0;
    for (let entry of AllAquariumData) {
        increment++;
        let scores = [];
        for (let i=0; i<13; i++) {
            scores.push(calculateFisherScore(entry, LocationFishData[i]));
        }
        console.log(increment);
        await db.scores.setLocationScores(entry.userid, scores);
    }
    await db.scores.updateOverallScores();
}

recalculate();