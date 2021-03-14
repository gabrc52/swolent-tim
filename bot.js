const Discord = require('discord.js');
const got = require('got');
const config = require('./config');
const token = require('./token');
const starboard = require('./starboard');

/// From https://discordjs.guide/popular-topics/reactions.html#awaiting-reactions
const client = new Discord.Client({ partials: ['MESSAGE', 'CHANNEL', 'REACTION'] });

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

/// Returns true or a string with the error message
function isVerified(id) {
  const guild = client.guilds.cache.get(config.guild_2025);
  const guildMember = guild.members.cache.get(id);
  if (guildMember === undefined) {
    return "You're not in the MIT 2025 server."
  } else {
    const role = guildMember.roles.cache.get(config.verified_role);
    if (role === undefined) {
      return "Swole Tim hasn't verified you in the MIT 2025 server. Please follow the instructions to verify there."
    } else {
      return true;
    }
  }
}

function verify(guildMember) {
  const guild = guildMember.guild;
  const verification = isVerified(guildMember.id);
  const channel = guild.channels.cache.find(c => c.name === 'landing-pad');
  if (verification === true) {
    const verifiedRole = guild.roles.cache.find(r => r.name === 'verified');
    if (verifiedRole === undefined) {
      channel.send(`Could not find verified role in ${guild.name}`);
    } else {
      guildMember.roles.add(verifiedRole);
    }
  } else {
    channel.send(`${guildMember}: ${verification}`);
  }
}

client.on('guildMemberAdd', guildMember => {
  verify(guildMember);
});

client.on('message', async msg => {
  const args = msg.content.split(' ');
  if (msg.content.trim() === 'tim.verify') {
    const guildMember = msg.guild.members.cache.get(msg.author.id);
    verify(guildMember);
  } else if (msg.content === 'tim.ping') {
    msg.channel.send(`Pong, ${msg.author}! The channel is ${msg.channel}.`);
  } else if (msg.content.trim() === 'tim.taken') {
    msg.reply("Please specify a possible kerb to know if it's taken or not (for example: `tim.taken stress`).")
  } else if (msg.content.trim() === 'tim.listinfo') {
    msg.reply("Please specify a mailing list to see its info (for example: `tim.listinfo plont`).")
  } else if (msg.content.startsWith('tim.taken')) {
    const possibleUser = msg.content.substr(10);
    /// https://www.twilio.com/blog/5-ways-to-make-http-requests-in-node-js-using-async-await
    try {
      const response = await got(`https://rgabriel.scripts.mit.edu/taken.php?name=${possibleUser}`);
      msg.channel.send(`${response.body}`);
    } catch (e) {
      console.error(`${e}`);
      msg.channel.send(`${e}`);
    }
  } else if (msg.content.startsWith('tim.listinfo')) {
    try {
      const list = msg.content.substr(13);
      const response = await got(`https://rgabriel.scripts.mit.edu/listinfo.php?name=${list}`);
      msg.channel.send(`${response.body}`);
    } catch (e) {
      console.error(e);
      msg.channel.send(`${e}`);
    }
  } else if (msg.content === 'tim.time') {
    msg.channel.send(`The time is ${new Date()}`);
  } else if (msg.content === 'tim.cwd') {
    msg.channel.send(`The working directory is ${process.cwd()}`);
  } else if (msg.content.trim() === 'whitelist') {
    msg.reply("Please specify a username after `whitelist` to get whitelisted");
  } else if (msg.content.startsWith('whitelist')) {
    const username = msg.content.substr(10);
    const url = `https://rgabriel.scripts.mit.edu/mc/prefrosh.php?name=${username}&discord=${msg.author.id}`;
    const verification = isVerified(msg.author.id);
    if (verification === true) {
      const response = await got(url);
      msg.channel.send(`${response.body}`);
    } else {
      msg.reply(`${verification} If you're not a prefrosh, go to https://mitcraft.ml to get whitelisted. Go to #help if you're having trouble.`);
    }
  }
});

client.on('messageReactionAdd', starboard.checkReactionForStarboard);

client.login(token);
