// Handle Clan Logic
// # ------------- #
const api = require('../../api');

// Constants
const STAR_VALUES = [100, 500, 2000, 10000, 50000];
const STAR_PERKS = [
    [ 'fish_cd', 1 ],
    [ 'coin_bonus', 5 ],
    [ 'exp_bonus', 5 ],
    [ 'quest_cd', 33.33 ],
    [ 'aquarium_capacity', 10 ],
    [ 'max_weight', 5 ]
];
const CLAN_SHOP_DATA = api.gamedata.getAllClanShopData();

// Functions
module.exports.getStarCount = function(fishCaught) {
    let stars = 1;
    for (let minimum of STAR_VALUES) {
        if (fishCaught >= minimum) { stars++; }
        else { break; }
    }
    return stars;
}

// Specific Perks -- START
module.exports.getCooldownReduction = function(clan) {
    if (!clan) { return 0; }
    let pctReduction = 1; // stars
    pctReduction += CLAN_SHOP_DATA.perks.fisc_cd.levels[clan.fish_cd].value; // clanshop
    return pctReduction;
}

module.exports.getMaxWeightIncrease = function(clan) {
    if (!clan) { return 0; }
    let stars = this.getStarCount(clan.fish_caught);
    let pctIncrease = stars >= 6 ? 5 : 0;
    return pctIncrease;
}
// Specific Perks -- END

module.exports.getPerks = async function(clan) { // COPY-PASTED FROM OLD VERSION
    let perks = { 
        fish_cd: 0, coin_bonus: 0, exp_bonus: 0, quest_cd: 0, quest_mba: 0, 
        vote_bonus: 0, campaign_mba: 0, aquarium_capacity: 0, max_weight: 0
    };
    if (!clan) { return perks }
    
    let stars = this.getStarCount(clan.fish_caught);
    // integrate clan stars
    for (let i=0; i<stars; i++) {
        let starPerk = STAR_PERKS[i];
        perks[starPerk[0]] = starPerk[1];
    }
    // integrate purchased clan upgrades
    for (const [dbCategory, data] of Object.entries(CLAN_SHOP_DATA.perks)) {
        let shopPerk = data.levels[clan[dbCategory]-1];
        if (!shopPerk) {
            continue;
        }
        perks[dbCategory] += shopPerk.value;
    }

    return perks;
}