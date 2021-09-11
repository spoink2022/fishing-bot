const api = require('../../api');

const { createEmbed } = require('./embed');

module.exports.sendVoteMessage = async function(userid) {
    const user = await client.users.fetch(userid);
    user.send(`<@${userid}>, Thanks for voting!\nYour fishing cooldown has been reset. Go fish!`).catch(() => {
        console.log('Couldn\'t DM user.');
    });
}

module.exports.sendWelcomeMessage = async function(userid) {
    client.users.fetch(userid).then(async(user) => {
        let options = {
            color: '#327fa2',
            title: 'Welcome to Big Tuna!',
            description: `**Here's what you can expect**\
            \n:small_blue_diamond: Catch **110+** unique fish species :fish:\
            \n:small_blue_diamond: Manage **9** different aquariums :truck:\
            \n:small_blue_diamond: Purchase **200+** pieces of equipment :fishing_pole_and_fish:\
            \n:small_blue_diamond: Compete with **1000+** other servers :sunglasses:\
            \n:small_blue_diamond: Join one of **100+** fishing clans :shield:\
            \n:small_blue_diamond: Make use of **30+** unique commands :scroll:\
            \n:small_blue_diamond: Become the **best** fisher of all time! :medal:\
            \n\nVisit our [Official Website](https://bigtuna.xyz) for information, a shop, and much more!\
            \n\nReady to start? Type \`.start\`\
            \nAlready have an account? Type \`.help\``
        };
        let embed = await createEmbed(options);

        user.send(embed).catch(() => {
            console.log('Couldn\'t DM user.');
        });
    }).catch(() => {
        console.log('Couldn\'t pull up userID for DM');
    });
}