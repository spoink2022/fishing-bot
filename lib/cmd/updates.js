// Handle "update" Command
// # ------------------- #

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