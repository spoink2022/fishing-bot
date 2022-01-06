const CampaignData = require('./data/campaign.json');

module.exports.getCampaignData = function(stage) {
    return CampaignData[stage-1];
}