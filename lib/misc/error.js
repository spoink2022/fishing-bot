module.exports.handleMessageReplyError = async function(err) {
    if (err.code === 50035) {
        console.log('Code 50035: Cannot reply to deleted message');
    } else if (err.code === 10008) {
        console.log('Code 10008: Cannot reply to deleted message (self)');
    } else {
        console.log(err);
    }
}