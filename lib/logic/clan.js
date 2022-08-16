// Handle Clan Logic
// # ------------- #
const api = require('../../api');

// Constants
const STAR_VALUES = [100, 500, 2000, 10000, 50000, 100000];
const STAR_PERKS = [
    [ 'fish_cd', 1 ],
    [ 'coin_bonus', 2 ],
    [ 'exp_bonus', 2 ],
    [ 'quest_cd', 33.33 ],
    [ 'aquarium_capacity', 5 ],
    [ 'max_weight', 5 ],
    [ 'card_storage_bonus', 5 ]
];
const CLAN_SHOP_DATA = api.clan.getAllClanShopData();

// Functions
module.exports.getStarCount = function(fishCaught) {
    let stars = 1;
    for (let minimum of STAR_VALUES) {
        if (fishCaught >= minimum) { stars++; }
        else { break; }
    }
    return stars;
}

module.exports.getAllPerks = function(clan) {
    let perks = {};
    const stars = this.getStarCount(clan.fish_caught);
    for (let i=0; i<stars; i++) { perks[STAR_PERKS[i][0]] = STAR_PERKS[i][1]; }
    
    for (const [key, value] of Object.entries(CLAN_SHOP_DATA.perks)) {
        perks[key] = (perks[key] || 0) + value.levels[clan[key]].value;
    }

    return perks;
}

// Specific Perks -- START
module.exports.getCooldownReduction = function(clan) {
    if (!clan) { return 0; }
    let pctReduction = 1; // stars
    pctReduction += CLAN_SHOP_DATA.perks.fish_cd.levels[clan.fish_cd].value; // clanshop
    return pctReduction;
}

module.exports.getCoinBonus = function(clan) {
    if (!clan) { return 0; }
    let stars = this.getStarCount(clan.fish_caught);
    let pctIncrease = stars >= 2 ? 2 : 0;
    pctIncrease += CLAN_SHOP_DATA.perks.coin_bonus.levels[clan.coin_bonus].value; // clanshop
    return pctIncrease;
}

module.exports.getExpBonus = function(clan) {
    if (!clan) { return 0; }
    let stars = this.getStarCount(clan.fish_caught);
    let pctIncrease = stars >= 3 ? 2 : 0;
    pctIncrease += CLAN_SHOP_DATA.perks.exp_bonus.levels[clan.exp_bonus].value; // clanshop
    return pctIncrease;
}

module.exports.getMaxWeightIncrease = function(clan) {
    if (!clan) { return 0; }
    let stars = this.getStarCount(clan.fish_caught);
    let pctIncrease = stars >= 6 ? 5 : 0;
    return pctIncrease;
}

module.exports.getVoteBonus = function(clan) {
    if (!clan) { return 0; }
    let voteBonus = CLAN_SHOP_DATA.perks.vote_bonus.levels[clan.vote_bonus].value;
    return voteBonus;
}

module.exports.getBonusClanPoints = function(clan) {
    if (!clan) { return 0; }
    let bonusPts = CLAN_SHOP_DATA.perks.campaign_mba.levels[clan.campaign_mba].value;
    return bonusPts;
}

module.exports.getAquariumCapacityIncrease = function(clan) {
    if (!clan) { return 0; }
    let stars = this.getStarCount(clan.fish_caught);
    let pctIncrease = stars >= 5 ? 5 : 0;
    return pctIncrease;
}

module.exports.getCardStorageBonus = function(clan) {
    if (!clan) { return 0; }
    let stars = this.getStarCount(clan.fish_caught);
    let bonusStorage = stars >= 7 ? 5 : 0;
    bonusStorage += CLAN_SHOP_DATA.perks.card_storage_bonus.levels[clan.card_storage_bonus].value;
    return bonusStorage;
}

module.exports.hasCooldownReduction = function(clan) { // quest reset cooldown
    if (!clan) { return false; }
    let stars = this.getStarCount(clan.fish_caught);
    return stars >= 4;
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