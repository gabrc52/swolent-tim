const fs = require('fs');
const Discord = require('discord.js');
const sss = require('shamirs-secret-sharing');
const config = require('./config');
const verification = require('./verification');

/// Someone pls implement this, I brain't
/// Accepts the base64 shamir fragment and the public key
/// Returns an encrypted string (probably base64 as well) with the encrypted shamir fragment
/// which will be sent through Discord DM
const encryptWithPublicKey = (fragment, publicKey) => {
    /// Stub: Just return the fragment for now... 
    return fragment;
}

const logConfession = (number, confession, confessor, msg, client) => {
    const secretStr = `Confession #${number} by ${confessor}: ${confession}`;
    const secret = Buffer.from(secretStr);
    const numMods = config.server_mods.length;
    const shares = sss.split(secret, { shares: numMods, threshold: Math.ceil(numMods / 2) });
    for (let i = 0; i < shares.length; i++) {
        const fragment = shares[i].toString('base64');
        client.users.fetch(config.server_mods[i]).then(user => {
            user.send(`**Confession #${number}**:\n${encryptWithPublicKey(fragment, config.public_keys[i])}`);
        });
    }
    msg.reply(s);
};

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
            logConfession(number, confession, confessor, msg, client);
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

const deconfessCommand = (msg, args, client) => {
    const fragmentStrings = args.slice(1);
    const numMods = config.server_mods.length;
    const neededFragments = Math.ceil(numMods / 2);
    if (fragmentStrings.length < neededFragments) {
        msg.reply(`Please enter exactly ${neededFragments} deconfession fragments.`);
    } else {
        const fragments = fragmentStrings.map((s) => Buffer.from(s, 'base64'));
        msg.reply(sss.combine(fragments).toString());
    }
};

module.exports = {
    confessCommand: confessCommand,
    deconfessCommand: deconfessCommand,
};