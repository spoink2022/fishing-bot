const express = require('express');
const Topgg = require('@top-gg/sdk');

const auth = require('../static/private/auth.json');
const api = require('../api');
const db = require('../db');
const adjustToEvent = require('./misc/adjust_to_event.js');
const { getClanPerks } = require('./misc/game_logic');
const { sendVoteMessage } = require('./misc/sender.js');

const app = express();
const port = 3000;

const webhook = new Topgg.Webhook();

app.post('/', webhook.middleware(), async(req, res) => {
    console.log(req.headers.authorization);
    if(req.headers.authorization === auth.voteAuth) {
        let userid = req.vote.user;
        let user = await db.users.fetchUser(userid);
        if(user) {
            let clanMember = await db.clan.fetchMember(user.userid);
            let clan = clanMember ? await db.clan.fetchClan(clanMember.clan) : null;
            let currentEvent = await db.events.getCurrentEvent();
            let perks = getClanPerks(clan);
            let rodInfo = api.fishing.getRodData(user.rod);
            let rodCooldown = rodInfo.cooldown;
            rodCooldown = adjustToEvent('rodCooldown', rodCooldown, currentEvent);
            rodCooldown *= (100 - perks.fish_cd)/100; // CLAN PERKS
            await db.users.removeFishingCooldown(userid, rodCooldown);
            if (perks.vote_bonus) {
                db.users.updateColumn(userid, 'lollipops', perks.vote_bonus);
            }
            sendVoteMessage(userid, perks.vote_bonus);
        }
    }
});

app.get('/', async(req, res) => {
    res.send("HEY");
});

app.listen(port, () => {
    console.log(`Listening for webhooks on port ${port}`);
});