module.exports.sendVoteMessage = async function(userid) {
    const user = await client.users.fetch(userid);
    user.send(`<@${userid}>, Thanks for voting!\nYour fishing cooldown has been reset. Go fish!`).catch(() => {
        console.log('Couldn\'t DM user.');
    });
}