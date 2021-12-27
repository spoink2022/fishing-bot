// Provides Information on Fish and Fishing Locations
// # ---------------------------------------------- #

const FishData = require('./data/fish.json');
const LocationData = require('./data/fishing-locations.json');

// Formatted Data
for (let locationId=0; locationId<LocationData.length; locationId++) {
    const fishList = LocationData[locationId].fish;
    for (let entry=0; entry<fishList.length; entry++) {
        FishData[fishList[entry].id].chance = fishList[entry].chance;
    }
}

const FishNames = FishData.map(obj => obj.name);
const FishChances = FishData.map(obj => obj.chance);
const FishSizes = FishData.map(obj => {
    return { min: obj.sizeMin, max: obj.sizeMax }
});

// Exports
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
module.exports.getFishDataFromLocation = function(locationId) {
    return FishData.slice(
        LocationData[locationId-1].fish[0].id,
        LocationData[locationId-1].fish[LocationData[locationId-1].fish.length-1].id + 1
    );
}

module.exports.getFishNamesFromLocation = function(locationId) {
    return FishNames.slice(
        LocationData[locationId-1].fish[0].id,
        LocationData[locationId-1].fish[LocationData[locationId-1].fish.length-1].id + 1
    );
}

module.exports.getFishChancesFromLocation = function(locationId) {
    return FishChances.slice(
        LocationData[locationId-1].fish[0].id,
        LocationData[locationId-1].fish[LocationData[locationId-1].fish.length-1].id + 1
    );
}

module.exports.getFishSizesFromLocation = function(locationId) {
    return FishSizes.slice(
        LocationData[locationId-1].fish[0].id,
        LocationData[locationId-1].fish[LocationData[locationId-1].fish.length-1].id + 1
    );
}