const express = require('express');
const Topgg = require('@top-gg/sdk');

const auth = require('../static/private/auth.json');
const db = require('../db');
const { sendVoteMessage } = require('./misc/vote.js');

const app = express();
const port = 443;

const webhook = new Topgg.Webhook(auth.topggToken);

app.post('/', webhook.middleware(), async(req, res) => {
    console.log(req.headers.authorization)
    if(req.headers.authorization === auth.voteAuth) {
        let userid = req.vote.user;
        let user = await db.users.fetchUser(userid);
        if(user) {
            await db.users.removeFishingCooldown(userid);
            sendVoteMessage(userid);
        }
    }
});

app.listen(port, () => {
    console.log(`Listening for webhooks on port ${port}`);
});