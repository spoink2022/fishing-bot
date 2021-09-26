const express = require('express');
const Topgg = require('@top-gg/sdk');

const auth = require('../static/private/auth.json');
const api = require('../api');
const db = require('../db');
const adjustToEvent = require('./misc/adjust_to_event.js');
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
            let rodInfo = api.fishing.getRodData(user.rod);
            let rodCooldown = rodInfo.cooldown;
            rodCooldown = adjustToEvent('rodCooldown', rodCooldown, currentEvent);
            rodCooldown *= (clanMember ? 0.99 : 1); // CLAN 1-STAR (ANY) => -1% cooldown
            await db.users.removeFishingCooldown(userid, rodCooldown);
            sendVoteMessage(userid);
        }
    }
});

app.get('/', async(req, res) => {
    res.send("HEY");
});

app.listen(port, () => {
    console.log(`Listening for webhooks on port ${port}`);
});