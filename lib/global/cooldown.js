let PlayerCooldowns = {};
const MESSAGE_COOLDOWN = 3 * 1000;

module.exports.runCheck = async function(userid) { // returns [can_run_function, remaining_cooldown]
    const lastMessageTime = PlayerCooldowns[userid];
    const now = Date.now();
    if(lastMessageTime) {
        const remainingTime = lastMessageTime - now + MESSAGE_COOLDOWN;
        if(remainingTime > 0) {
            return [false, remainingTime];
        }
    }
    
    PlayerCooldowns[userid] = now;
    setTimeout(deleteFromCooldowns, MESSAGE_COOLDOWN, userid);
    return [true, null];
}

async function deleteFromCooldowns(userid) {
    if(PlayerCooldowns[userid]) {
        delete PlayerCooldowns[userid];
    }
    return;
}