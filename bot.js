const Discord = require('discord.js');
const got = require('got');
const config = require('./config');
const token = require('./token');
const commands = require('./commands');
const starboard = require('./starboard');
const verification = require('./verification');

/// From https://discordjs.guide/popular-topics/reactions.html#awaiting-reactions
const client = new Discord.Client({ partials: ['MESSAGE', 'CHANNEL', 'REACTION'] });

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', msg => {   
    const args = msg.content.split(' ');
    if (commands[args[0]] !== undefined) {
        commands[args[0]](msg, args, client);
    }
});

client.on('guildMemberAdd', guildMember => {
    verification.verify(guildMember, client);
});

client.on('messageReactionAdd', starboard.checkReactionForStarboard);

client.on('guildMemberUpdate', (oldMember, newMember) => {
    const guild = client.guilds.cache.get(config.guild_2025);
    if (newMember.guild == guild && oldMember.roles.cache.get(config.verified_role) === undefined && newMember.roles.cache.get(config.verified_role) !== undefined) {
        const channel = guild.channels.cache.get(config.welcome_channel);
        const user = newMember.user;
        channel.send(`${user}, welcome to MIT '25! Please head over to <#783439183888384031> to get tags for pronouns, regions, etc., and if you're new to Discord, <#789592290518892545> will explain how to use this platform! Then you can introduce yourself in <#786487633928650813>. Congratulations again! <:bbydab:784988174647558145> :confetti_ball:\n\nP.S. We have some special guests here (current students and folks from the admissions office)! Say hi in <#783818929961173002> or in this channel :smile: (the server is still ours tho, they can only access the Boomer chats, not all other chats for their own safety)!!`);
    }
});

client.login(token);
