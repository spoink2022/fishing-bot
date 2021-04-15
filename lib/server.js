const express = require('express');
const Topgg = require('@top-gg/sdk');

const auth = require('../static/private/auth.json');
const db = require('../db');
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
            await db.users.removeFishingCooldown(userid);
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