const WeatherData = require('./data/weather.json');

// Formatted Data
for (let i=0; i<WeatherData.locations.length; i++) {
    let prefixSum = [];
    for (let j=0; j<WeatherData.locations[i].chances.length; j++) {
        prefixSum.push((prefixSum[j-1] || 0) + WeatherData.locations[i].chances[j]);
    }
    WeatherData.locations[i].prefixSumChances = prefixSum;
}

// Exports
module.exports.getWeatherEffect = function(weatherNum) {
    return WeatherData.effects[weatherNum];
}

module.exports.getWeatherLocations = function() {
    return WeatherData.locations;
}