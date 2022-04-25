import { MessageEmbed, TextChannel } from 'discord.js';
import fs from 'fs';

import type { Client, Channel, Message, MessageReaction, Snowflake, User, PartialUser } from "discord.js";

interface StarboardConfig {
    reaction_threshold: number,
    embed_color: string,
    channel: Snowflake,
    embed_bots: Snowflake[],
}

// TODO: Migrate this to a persistent db data structure, rather than making the filesystem do it
const rememberStarboard = (msg: Message) => {
    /// https://remarkablemark.org/blog/2017/12/17/touch-file-nodejs/
    fs.closeSync(fs.openSync(`starboard/${msg.id}`, 'w'));
};

const hasBeenStarboarded = (msg: Message) => {
    /// https://flaviocopes.com/how-to-check-if-file-exists-node/
    try {
        return fs.existsSync(`starboard/${msg.id}`);
    } catch (e) {
        return false;
    }
};

const addToStarboard = (msg: Message, channel: TextChannel, config: StarboardConfig) => {
    const user = msg.member!.user;
    const attachments = msg.attachments.array();
    const embeds = msg.embeds;
    const embed = new MessageEmbed()
        .setColor(config.embed_color)
        .setAuthor(user.username, user.avatarURL() ?? "")
        .setDescription(`${msg.content}`)
        .setFooter(`#${(msg.channel as TextChannel).name} • ${msg.createdAt}`)
        .addField('Jump', `[Go to message!](${msg.url})`);
    if (attachments.length > 0) {
        embed.setImage(attachments[0].proxyURL);
    }
    if (embeds.length && config.embed_bots.indexOf(msg.author.id) > -1) {
        const targetEmbed = embeds[0];
        embed.setDescription(targetEmbed.description);
        embed.setAuthor(targetEmbed.footer?.text?.slice(2) ?? "", user.avatarURL() ?? "");
    }
    channel.send(embed);
};

const starboardReact = async (guild_2025: Snowflake, config: StarboardConfig, channel: TextChannel, reaction: MessageReaction, _user: User | PartialUser) => {
    /// From https://discordjs.guide/popular-topics/reactions.html#listening-for-reactions-on-old-messages
    if (!channel) {
        return;
    }
    if (reaction.partial) {
        await reaction.fetch();
    }

    // count is guaranteed to exist
    // since the rxn isn't partial now
    if (reaction.count! >= config.reaction_threshold) {
        switch (reaction.emoji.name) {
        case '⭐':
            if (!hasBeenStarboarded(reaction.message) && reaction.message.guild?.id == guild_2025) {
                console.log(`Starboarding ${reaction.message.id}`);
                rememberStarboard(reaction.message);
                addToStarboard(reaction.message, channel as TextChannel, config);
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

const setup = (client: Client, config: any) => {
    const sb_config = config.starboard as StarboardConfig;
    const channel = client.channels.resolve(sb_config.channel);
    if (!(channel instanceof TextChannel)) {
        throw new Error("The starbaord channel needs to be text-based!");
    }
    client.on('messageReactionAdd', starboardReact.bind(null, config.guild_2025, sb_config, channel));
    return [];
};
module.exports = {setup};
