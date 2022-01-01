// Provides Information on Fish and Fishing Locations
// # ---------------------------------------------- #

const FishData = require('./data/fish.json');
const LocationData = require('./data/fishing-locations.json');

// Formatted Data
for (let i=0; i<LocationData.length; i++) {
    // Add "chance" field to fish
    const fishList = LocationData[i].fish;
    for (let entry=0; entry<fishList.length; entry++) {
        FishData[fishList[entry].id].chance = fishList[entry].chance;
    }
    // Add "prefixSumChances" field to location
    LocationData[i].prefixSumChances = [];
    for (let j=0; j<LocationData[i].fish.length; j++) {
        LocationData[i].prefixSumChances.push((LocationData[i].prefixSumChances[j-1] || 0) + LocationData[i].fish[j].chance);
    }
}

const FishNames = FishData.map(obj => obj.name);
const FishMap = generateFishMap();

// Formatting Functions
function generateFishMap() {
    let myMap = {};
    for (let i=0; i<FishNames.length; i++) {
        myMap[FishNames[i]] = i;
    }
    return myMap;
}

// Exports
module.exports.getFishDataByName = function(fishName) {
    return FishData[FishMap[fishName]];
}

module.exports.getFishData = function(fishId) {
    return FishData[fishId];
}

module.exports.getLocationData = function(locationId) {
    return LocationData[locationId-1];
}

module.exports.getLocationCount= function() {
    return LocationData.length;
}
// Exports - Bulk
module.exports.getFishNames = function() {
    return FishNames;
}

module.exports.getFishDataFromLocation = function(locationId) {
    return FishData.slice(
        LocationData[locationId-1].fish[0].id,
        LocationData[locationId-1].fish[LocationData[locationId-1].fish.length-1].id + 1
    );
}

module.exports.getAllUnlockedFishData = function(userLevel) {
    return FishData.slice(
        1,
        LocationData[Math.floor(userLevel/10)].fish[LocationData[Math.floor(userLevel/10)].fish.length-1].id + 1
    );
}

module.exports.getAllUnlockedLocationData = function(userLevel) {
    return LocationData.slice(
        0,
        Math.floor(userLevel/10) + 1
    )
}