const Discord = require('discord.js');
const fs = require('fs');

const rememberStarboard = msg => {
    /// https://remarkablemark.org/blog/2017/12/17/touch-file-nodejs/
    fs.closeSync(fs.openSync(`starboard/${msg.id}`, 'w'));
};

const hasBeenStarboarded = msg => {
    /// https://flaviocopes.com/how-to-check-if-file-exists-node/
    try {
        return fs.existsSync(`starboard/${msg.id}`);
    } catch (e) {
        return false;
    }
};

const addToStarboard = (msg, channel, color) => {
    const user = msg.member.user;
    const attachments = msg.attachments.array();
    const embeds = msg.embeds;
    const embed = new Discord.MessageEmbed()
        .setColor(color)
        .setAuthor(user.username, user.avatarURL())
        .setDescription(`${msg.content}`)
        .setFooter(`#${msg.channel.name} • ${msg.createdAt}`)
        .addField('Jump', `[Go to message!](${msg.url})`);
    if (attachments.length > 0) {
        embed.setImage(attachments[0].proxyURL);
    }
    if (msg.author.username == 'HaikuBot') {
        embed.setDescription(embeds[0].description);
        embed.setAuthor(embeds[0].footer.text.slice(2), user.avatarURL());
    }
    channel.send(embed);
};

const starboardReact = async (config, channel, reaction, user) => {
    /// From https://discordjs.guide/popular-topics/reactions.html#listening-for-reactions-on-old-messages
    if (reaction.partial) {
        await reaction.fetch();
    }

    if (reaction.count >= config.reaction_threshold) {
        switch (reaction.emoji.name) {
        case '⭐':
            if (hasBeenStarboarded(reaction.message) === false) {
                console.log(`Starboarding ${reaction.message.id}`);
                rememberStarboard(reaction.message);
                addToStarboard(reaction.message, channel, config.embed_color);
            } else {
                console.log(`Won't starboard ${reaction.message.id} as it has already been starboarded`);
            }
            break;
        case '📌':
            await reaction.message.pin();
            break;
        }
    }
};

module.exports = (client, config) => {
    const sb_config = config.starboard;
    const channel = client.channels.resolve(sb_config.channel);
    client.on('messageReactionAdd', starboardReact.bind(null, sb_config, channel));
    return [];
};
