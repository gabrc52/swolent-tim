const Discord = require('discord.js');
const got = require('got');
const fs = require('fs');
const config = require('./config');
const token = require('./token');

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

function rememberStarboard(msg) {
  /// https://remarkablemark.org/blog/2017/12/17/touch-file-nodejs/
  fs.closeSync(fs.openSync(`starboard/${msg.id}`, 'w'));
}

function hasBeenStarboarded(msg) {
  /// https://flaviocopes.com/how-to-check-if-file-exists-node/
  try {
    return fs.existsSync(`starboard/${msg.id}`);
  } catch (e) {
    return false;
  }
}

function addToStarboard(msg) {
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
}

client.on('messageReactionAdd', async (reaction, user) => {

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
});

client.login(token);
