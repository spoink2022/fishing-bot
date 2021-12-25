module.exports.byPurchase = function(user) {
    if (user.big_supporter >= 1) {
        return 0xd4af37;
    } else if (user.supporter >= 1) {
        return 0xfa8072;
    }
    return 0x888888;
}

module.exports.byServerPurchase = function(server) {
    if (server.custom_fish) {
        return 0xd4af37;
    }
    return 0x888888;
}