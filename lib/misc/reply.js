module.exports.sendReply = async function(interaction, data) {
    return interaction.reply(data).catch(err => {
        console.log(err);
    });
}