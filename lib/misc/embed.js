const { MessageEmbed, MessageAttachment } = require('discord.js');

module.exports.createEmbed = async function(options) {
    let o = options, embed = new MessageEmbed();
    if(o.author) { o.author.length>1 ? embed.setAuthor(o.author[0], o.author[1]) : embed.setAuthor(o.author[0]) }
    if(o.title) { embed.setTitle(o.title); }
    if(o.color) { embed.setColor(o.color); }
    if(o.description) { embed.setDescription(o.description); }
    if(o.fields) { embed.addFields(o.fields); }
    if(o.attachment) {
        let attachment = new MessageAttachment(o.attachment.content, o.attachment.name);
        embed.attachFiles(attachment);
        embed.setImage(`attachment://${o.attachment.name}`);
    }
    if(o.footer) { embed.setFooter(o.footer); }
    return embed;
}