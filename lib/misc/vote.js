module.exports.sendVoteMessage = async function(userid) {
    const user = await client.users.fetch(userid);
    console.log(user);
}

