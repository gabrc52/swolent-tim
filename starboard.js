const Discord = require('discord.js');
const fs = require('fs');
const config = require('./config');

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

const addToStarboard = msg => {
    const channel = msg.guild.channels.resolve(config.starboard_channel);
    const user = msg.member.user;
    const attachments = msg.attachments.array();
    const embeds = msg.embeds;
    const embed = new Discord.MessageEmbed()
        .setColor(config.embed_color)
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

module.exports = {
    checkReactionForStarboard: async (reaction, user) => {
        /// From https://discordjs.guide/popular-topics/reactions.html#listening-for-reactions-on-old-messages
        if (reaction.partial) {
            await reaction.fetch();
        }

        if (reaction.count >= config.reaction_threshold) {
            if (reaction.emoji.name === '⭐') {
                if (hasBeenStarboarded(reaction.message) === false) {
                    console.log(`Starboarding ${reaction.message.id}`);
                    rememberStarboard(reaction.message);
                    addToStarboard(reaction.message);
                } else {
                    console.log(`Won't starboard ${reaction.message.id} as it has already been starboarded`);
                }
            }
            if (reaction.emoji.name == '📌') {
                await reaction.message.pin();
            }
        }
    },
}