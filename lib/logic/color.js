module.exports.STATIC = {
    default: 0x888888,
    tuna: 0x327fa2,
    quest: [ 0x3acadc, 0x7f7f7f, 0xa43636, 0xffd700, 0xfa8072 ],
    location: [ 
        0x327fa2, 0x587e7e, 0x3899cd, 0x2b3f49, 0x1da2d8, 0xdfc25c, 0x4EC3EC, 0x0169B5, 0x0169B5, 0x046ab4, 0x0439b4, 0x170E99, 0x5562F6, 0x023966

    ],
    clanLocation: [
        0x86bfde, 0x276296, 0xcbceac, 0x0fbbcf, 0x5494cf, 0x10437a, 0x7f7ab6, 0x0a3e6b
    ],
    coin: 0xffd700,
    shop: 0x5cd411,
    success: 0x32cd32,
    failure: 0xa43636,
    give: 0x2d13f2,
    bountyComplete: 0x32cd32,
    bountyIncomplete: 0xa43636,
    clan: 0x2acaea,
    consumer: 0xdddddd,
    premium: 0xffebcd,
    sashimi: 0xfa8072,
    trophy: 0xd4af37,
    yellow: 0xffff00,
    light: 0xdddddd
}

module.exports.byPurchase = function(user) {
    if (user.big_supporter >= 1) {
        return 0xd4af37;
    } else if (user.supporter >= 1) {
        return 0xfa8072;
    }
    return this.STATIC.default;
}

module.exports.byServerPurchase = function(server) {
    if (server.premium_tier > 0) {
        return 0xd4af37;
    }
    return this.STATIC.default;
}