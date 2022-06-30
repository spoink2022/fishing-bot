// Handle "update" Command
// # ------------------- #
const db = require('../../db');

const logic = require('../logic');

const { sendReply } = require('../misc/reply.js');

module.exports.sendUpdatesCommand = async function(interaction) {
    sendReply(interaction, { embeds: [update2] });
}

const update2 = {
    color: logic.color.STATIC.tuna,
    title: 'Major Update - Slash Commands',
    description: `**Slash Commands**
:small_blue_diamond: In addition to regular commands, slash commands have been added
:small_blue_diamond: If slash commands don't work, **re-invite Big Tuna**
:small_blue_diamond: Support for custom prefixes have been dropped
:small_blue_diamond: Command structure changed (see \`/help all\`)
:small_blue_diamond: Custom fish commands remain functional
\n**Balance**
:small_blue_diamond: Trash has been removed from the game
:small_blue_diamond: Rings have been nerfed (existing rings will be nerfed as well)
:small_blue_diamond: Fishing cooldown has been removed for users below Lvl. 10
\n**New Commands**
\`/stats global\`
\`/quickstart\`
\n**Other**
:small_blue_diamond: Huge performance improvements
:small_blue_diamond: Started sharding
:small_blue_diamond: Entry point is now \`/help\` or \`/quickstart\``
};

module.exports.sendEventCommand = async function(interaction) {
    // Step 1 - Fetch Information
    let event = await db.events.getUpcomingEvent();
    if (!event) {
        event = await db.events.getCurrentEvent();
    }

    // Step 2 - Send Embed
    let embed;
    if (!event) {
        embed = {
            color: logic.color.STATIC.default,
            title: 'There are no upcoming events :mailbox_with_no_mail:',
            description: 'Nothing to see here.'
        };
    } else if (Date.now() < event.start_time) {
        embed = {
            color: logic.color.STATIC.default,
            title: `Upcoming Event: ${event.name}`,
            description: event.description.replace(/\\n/g, '\n'),
            thumbnail: {
                url: event.thumbnail
            },
            footer: {
                text: `Starts in ${logic.text.millisToString(event.start_time - Date.now())}`
            }
        };
    } else {
        embed = {
            color: '#' + event.color,
            title: `LIVE EVENT: ${event.name}`,
            description: event.description.replace(/\\n/g, '\n'),
            thumbnail: {
                url: event.thumbnail
            },
            footer: {
                text: `Ends in ${logic.text.millisToString(event.end_time - Date.now())}`
            }
        };
    }

    sendReply(interaction, { embeds: [embed] });
}