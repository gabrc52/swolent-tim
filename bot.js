const Discord = require('discord.js');
const got = require('got');
const config = require('./config');
const token = require('./token');
const starboard = require('./starboard');
const verification = require('./verification');
const breakout = require('./breakout');

/// From https://discordjs.guide/popular-topics/reactions.html#awaiting-reactions
const client = new Discord.Client({ partials: ['MESSAGE', 'CHANNEL', 'REACTION'] });
const commands = {};
const prefix = 'tim.';

const command_modules = [require('./commands')];

client.on('ready', () => {
    for (const module of command_modules) {
        for (const cmd of module(client, config)) {
            const name = cmd.name.toLowerCase();
            if (cmd.unprefixed) {
                commands[name] = cmd.call;
            }
            commands[prefix + name] = cmd.call;
        }
    }
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', msg => {
    const args = msg.content.split(' ');
    const target = commands[args[0].toLowerCase()];
    if (target !== undefined) {
        target(msg, args);
    }
});

client.on('guildMemberAdd', guildMember => {
    verification.verify(guildMember, client);
});

client.on('messageReactionAdd', starboard.checkReactionForStarboard);

client.on('guildMemberUpdate', (oldMember, newMember) => {
    const guild = client.guilds.cache.get(config.guild_2025);

    const wasGivenRole = (role) => oldMember.roles.cache.get(role) === undefined && newMember.roles.cache.get(role) !== undefined;

    if (newMember.guild == guild) {
        if (wasGivenRole(config.verified_role)) {
            const channel = guild.channels.cache.get(config.welcome_channel);
            const user = newMember.user;
            channel.send(`${user}, welcome to MIT '25! Please head over to <#783439183888384031> to get tags for pronouns, regions, etc., and if you're new to Discord, <#789592290518892545> will explain how to use this platform! Then you can introduce yourself in <#786487633928650813>. Congratulations again! <:bbydab:784988174647558145> :confetti_ball:\n\nP.S. We have some special guests here (current students and folks from the admissions office)! Say hi in <#783818929961173002> or in this channel :smile: (the server is still ours tho, they can only access the Boomer chats, not all other chats for their own safety)!!`);
        }
        if (wasGivenRole(config.breakout_unassigned_role) && oldMember.roles.cache.get(config.breakout_assigned_role) === undefined) {
            breakout.assignToRoom(newMember.user.id, guild);
        }
    }
});

client.login(token);
