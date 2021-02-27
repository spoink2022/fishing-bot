module.exports = async function(msg) {
    let cmd = msg.content.split(' ')[1] || '';
    let args = msg.content.substring(cmd.length + PREFIX.length + 1).toLowerCase().split(' ');
    console.log(cmd);
    if(cmd === 'setevent') {
        sendSetEvent(msg, args);
    } else {
        msg.channel.send(`${msg.author.username}, that's not a valid admin command!`);
    }
}

async function sendSetEvent(msg, args) {
    msg.channel.send('eEVENT SET');
}