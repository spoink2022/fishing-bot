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
            color: api.visuals.getColor('classic', 'classic'),
            description: `:fish: __**Your fishing journey starts here!**__ :fish:\
            \n*you are getting this because you've just joined a server that's turned on this feature\
            \n\n:small_blue_diamond: Catch over 70 unique fish species, each with unique stats and weight ranges :moneybag:\
            \n\n:small_blue_diamond: Showcase your most impressive catches in your aquarium :truck:\
            \n:small_blue_diamond: Earn COINS from those aquariums :money_mouth:\
            \n\n:small_blue_diamond: Upgrade your equipment :fishing_pole_and_fish:\
            \n\n:small_blue_diamond: Compete with your friends and other servers :sunglasses:\
            \n:small_blue_diamond: Become the best fisher of all time! :medal:\
            \n\nStill not convinced? *Visit our [Official Website](https://bigtuna.xyz)*\
            \nReady to start? Just type \`${PREFIX}start\`\
            \n*A hands-on start guide is available at [bigtuna.xyz/start](https://bigtuna.xyz/start)*`
        };
        let embed = await createEmbed(options);

        user.send(embed).catch(() => {
            console.log('Couldn\'t DM user.');
        });
    }).catch(() => {
        console.log('Couldn\'t pull up userID for DM');
    });
}