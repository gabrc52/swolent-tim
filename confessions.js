const fs = require('fs');

const confessCommand = (msg, args, client) => {
    if (msg.deletable) {
        msg.delete();
    } else {
        msg.reply("Could not delete message, either the permissions are wrong, or this is a DM channel. Please delete manually.");
    }
    const confession = msg.content.substr(8);
    const confessor = msg.author.id;
    const guild = client.guilds.cache.get(config.guild_2025);
    const channel = guild.channels.resolve(config.confessions_channel);
    const verificationStatus = verification.isVerified(confessor, client);
    if (verificationStatus === true) {
        let number;
        fs.readFile('confession_counter', 'utf8', (err, data) => {
            if (err) {
                number = 1;
            } else {
                data++;
                number = data;
            }
            fs.writeFileSync('confession_counter', number);
            const embed = new Discord.MessageEmbed()
                .setAuthor(`Confession #${number}`)
                .setColor(config.embed_color)
                .setDescription(confession);
            channel.send(embed);
        });
    } else {
        msg.reply(`Can't confess: ${verificationStatus}`);
    }
};

module.exports = {
    confessCommand: confessCommand,
};