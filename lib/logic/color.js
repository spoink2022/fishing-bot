module.exports.STATIC = {
    default: 0x888888,
    tuna: 0x327fa2,
    quest: [ 0x3acadc, 0x7f7f7f, 0xa43636, 0xffd700, 0xfa8072 ],
    location: [ 
        0x327fa2, 0x587e7e, 0x3899cd, 0x2b3f49, 0x1da2d8, 0xdfc25c, 0x4EC3EC, 0x0169B5, 0x0169B5, 0x046ab4, 0x0439b4
    ],
    coin: 0xffd700
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
    if (server.custom_fish) {
        return 0xd4af37;
    }
    return this.STATIC.default;
}