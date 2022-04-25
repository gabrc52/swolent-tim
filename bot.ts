import { Client } from 'discord.js';
import config = require('./config');
import * as breakout from './breakout';
import { getVerifyLink } from './verification';
import { readFileSync } from 'fs';

import type { Message, Snowflake, TextChannel } from 'discord.js';

interface CommandTable {
	[index: string]: (msg: Message, args: string[], client: Client) => void;
}

/// From https://discordjs.guide/popular-topics/reactions.html#awaiting-reactions
const client = new Client({
    partials: ['MESSAGE', 'CHANNEL', 'REACTION'],
    disableMentions: 'everyone',
});
const commands: CommandTable = {};
const prefix = 'tim.';

const modules = ['commands', 'confessions', 'starboard', 'verification'];

client.on('ready', () => {
    for (const module of modules) {
        const cmds = require('./' + module).setup(client, config);
        if (!cmds) {
            continue;
        }
        for (const cmd of cmds) {
            const name = cmd.name.toLowerCase();
            if (cmd.unprefixed) {
                commands[name] = cmd.call;
            }
            commands[prefix + name] = cmd.call;
        }
    }
    console.log(`Logged in as ${client.user!.tag}!`);
});

client.on('message', msg => {
    const args = msg.content.split(' ');
    const commandName = args[0].toLowerCase();
    const command = commands[commandName];
    if (command) {
        command(msg, args, client);
    }
});

// TODO: move this into new module system
client.on('guildMemberUpdate', (oldMember, newMember) => {
    const guild = client.guilds.cache.get(config.guild_2025);

    const wasGivenRole = (role: Snowflake) => !oldMember.roles.cache.get(role) && newMember.roles.cache.get(role);

    if (newMember.guild == guild) {
        if (wasGivenRole(config.verification.admitted_role) || (wasGivenRole(config.verification.verified_role) && !oldMember.roles.cache.get(config.verification.admitted_role))) {
            const channel = guild.channels.cache.get(config.welcome_channel) as TextChannel;
            const user = newMember.user;
            channel.send(`${user}, welcome to MIT '25! Please head over to <#783439183888384031> to get tags for pronouns, regions, etc., and if you're new to Discord, <#789592290518892545> will explain how to use this platform! Then you can introduce yourself in <#783438962756288529>. \n\nP.S. We have upperclassfolx residing in <#783818929961173002> (they are quarantined to specific channels).`);
        }
        if (wasGivenRole(config.breakout_unassigned_role) && !oldMember.roles.cache.get(config.breakout_assigned_role)) {
            breakout.assignToRoom(newMember.user.id, guild);
        }
    }
});

const token_thunks = [
    () => process.env["BOT_TOKEN"],
    () => readFileSync("token.txt"),
    () => require('./token'),
];

const get_token = function () {
    for (const thunk of token_thunks) {
        try {
            const value = thunk();
            if (value) {
                return value.toString().trim();
            }
        } catch (e) { }
    }
    throw new Error("Could not find token! Searched in the following locations: $BOT_TOKEN, token.txt, token.js");
}

client.login(get_token());
