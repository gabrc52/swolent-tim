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

client.login(token);
