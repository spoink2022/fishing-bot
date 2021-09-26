const api = require('./index.js');

const AquariumData = require('./data/aquarium.json');
const BaitData = require('./data/bait.json');
const BaitNames = Object.keys(BaitData);
let CampaignData = require('./data/campaign.json');
const MAX_CAMPAIGN_STAGE = CampaignData.length;
const QuestData = require('./data/quest.json');
const WeatherData = require('./data/weather.json');

// format CampaignData
let fishNames = api.fishing.getFishNames();
for (let i=0; i<CampaignData.length; i++) {
    let requirements = [];
    for (let entry of CampaignData[i].requirements_string) {
        let fishID = fishNames.indexOf(entry[0].replace(/_/g, ' '));
        requirements.push([fishID, entry[1]]);
    }
    CampaignData[i].requirements = requirements;
}

module.exports.getAquariumInfo = function(id) {
    return AquariumData[id];
}

module.exports.getAquariumLabels = function() { // ['aquarium_shabby', 'aquarium_standard', etc.]
    return AquariumData.map(obj => `aquarium_${obj.name.replace(/ /g, '_')}`);
}

module.exports.getAquariumNames = function() { // ['shabby', 'standard', etc.]
    return AquariumData.map(obj => obj.name);
}

module.exports.getAllAquariumData = function() {
    return AquariumData;
}

// gets highest aquarium ID a user can view info about
module.exports.getHighestAquariumID = function(level) {
    const categoryLen = AquariumData.length;
    for(let i=0; i<categoryLen; i++) {
        if(AquariumData[i].level > level) {
            return i;
        }
    }
    return categoryLen-1;
}

module.exports.getAllBaitData = function() {
    return BaitData;
}
module.exports.getAllBaitNames = function(stars=false) {
    if (!stars) {
        return BaitNames;
    } else {
        return BaitNames.filter(baitName => BaitData[baitName].stars === stars);
    }
}
module.exports.getBaitsByFamily = function(family) {
    return Object.entries(BaitData).filter(tuple => tuple[1].families.includes(family)).map(tuple => tuple[0]);
}
module.exports.getBaitData = function(bait) {
    return BaitData[bait];
}

module.exports.getCampaignData = function(stage) {
    if (stage > MAX_CAMPAIGN_STAGE) { return null; }
    return CampaignData[stage-1];
}

module.exports.getRandomQuestData = function() {
    let chanceNum = Math.floor(Math.random()*100)+1
    for(const questTypeData of QuestData) {
        chanceNum -= questTypeData.chance
        if(chanceNum <= 0) {
            return questTypeData;
        }
    }
    console.log('ALERT - QUEST DATA');
    return QuestData[0]; // just in case some sketchy stuff happens
}

module.exports.getWeatherData = function() {
    return WeatherData;
}