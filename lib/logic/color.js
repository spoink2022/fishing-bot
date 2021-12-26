module.exports.STATIC = {
    default: 0x888888,
    quest: [ 0x3acadc, 0x7f7f7f, 0xa43636, 0xffd700, 0xfa8072 ]
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