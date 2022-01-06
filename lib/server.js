const express = require('express');
const Topgg = require('@top-gg/sdk');

const { voteAuth } = require('../private/config.json');

const db = require('../db');
const logic = require('./logic');
const { getCooldownTime } = require('./misc/calculations.js');

const app = express();
const port = 3000;

const webhook = new Topgg.Webhook();

app.post('/', webhook.middleware(), async(req, res) => {
    if (req.headers.authorization === voteAuth) {
        const userid = req.vote.user;
        const user = await db.users.fetchUser(userid);
        if (user) {
            // Update Database
            const clan = await db.clan.fetchClanByUserid(user.userid);
            const currentEvent = await db.events.getCurrentEvent();
            const voteBonus = logic.clan.getVoteBonus(clan);
            const cooldown = getCooldownTime(user, clan, currentEvent);
            db.users.updateColumns(user.userid, { cooldown: -cooldown, lollipops: voteBonus });
            db.users.setColumns(user.userid, { next_vote: Date.now() + 1000*60*60*12 });
            // Send Message
            let messageContent = 'Thanks for voting! Your fishing cooldown has been reset. Go fish!';
            if (voteBonus) { messageContent += `\n+${voteBonus} :lollipop:`; }
            const discordUser = await global.client.users.fetch(userid);
            discordUser.send(messageContent).catch(() => {
                console.log('Couldn\'t DM user (vote).');
            });
        }
    }
});

app.get('/', async(req, res) => {
    res.send("HEY");
});

app.listen(port, () => {
    console.log(`Listening for webhooks on port ${port}`);
});