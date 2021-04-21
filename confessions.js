const fs = require('fs');
const Discord = require('discord.js');
const sss = require('shamirs-secret-sharing');
const config = require('./config');
const verification = require('./verification');
const crypto = require('crypto');

/// Accepts the base64 shamir fragment and the public key
/// Returns an encrypted string (probably base64 as well) with the encrypted shamir fragment
/// which will be sent through Discord DM
const encryptWithPublicKey = (fragment, publicKey) => {
    const buffer = Buffer.from(fragment, 'utf8');
    const encrypted = crypto.publicEncrypt(publicKey, buffer);
    return encrypted.toString('base64');
}

const logConfession = async (number, confession, confessor, msg, client) => {
    const secretStr = `Confession #${number} by ${confessor}`;
    const secret = Buffer.from(secretStr);
    const mods = Object.keys(config.server_mods);
    const publicKeys = Object.values(config.server_mods);
    const numMods = mods.length;
    const shares = sss.split(secret, { shares: numMods, threshold: Math.floor(numMods / 2) + 1 });
    for (let i = 0; i < shares.length; i++) {
        const fragment = `Confession #${number} fragment decrypted successfully: ${shares[i].toString('base64')}`;
        const encryptedFragment = encryptWithPublicKey(fragment, publicKeys[i]);
        try {
            const user = await client.users.fetch(mods[i]);
            user.send(`**Confession #${number}**: ${encryptedFragment}`);
            user.send(`${confession}`);
        } catch (e) {
            msg.reply(e);
        }
    }
};

/**
 * Confess command
 * @param {Discord.Message} msg 
 * @param {Array<String>} args 
 * @param {Discord.Client} client 
 */

const confessCommand = async (msg, args, client) => {
    let confession = msg.content.substr(args[0].length + 1).trim();
    /// Remove brackets
    if (confession[0] === '[' && confession[confession.length - 1] === ']') {
        confession = confession.substring(1, confession.length - 1);
    }
    /// If the confession is just a test, don't post it
    if (confession === 'test' || confession === 'testing') {
        await msg.channel.send(`Go ahead with your confession, just write your confession instead of \`${confession}\``);
        await msg.delete();
        return;
    }
    if (msg.deletable) {
        await msg.delete();
    } else if (msg.channel.type === 'dm') {
        /// This is a DM channel
        const reply = await msg.reply("For your security, please delete your confession. This message will self-destruct in 5 minutes.");
        setTimeout(() => reply.delete(), 5 * 60 * 1000);
    } else {
        msg.reply("Could not delete message, either the permissions are wrong, or this is a DM channel. Please delete manually.");
    }
    /// If sent by a webhook (such as NQN), ignore
    if (msg.webhookID) {
        return;
    }
    const confessor = msg.author.id;
    const guild = client.guilds.cache.get(config.guild_2025);
    const channel = guild.channels.resolve(config.confessions_channel);
    const verificationStatus = verification.isVerified(confessor, client);
    verificationStatus.then(() => {
        fs.readFile('confession_counter', 'utf8', (err, data) => {
            let number = 1 + (err ? 0 : +data);
            logConfession(number, confession, confessor, msg, client);
            fs.writeFileSync('confession_counter', number.toString());
            const embed = new Discord.MessageEmbed()
                .setAuthor(`Confession #${number}`)
                .setColor(config.embed_color)
                .setDescription(confession);
            channel.send(embed);
        });
    }).catch(error => msg.reply(`Can't confess: ${error}`));
};

const deconfessCommand = (msg, args, _client) => {
    const fragmentStrings = args.slice(1);
    const numMods = config.server_mods.length;
    const neededFragments = Math.ceil(numMods / 2);
    if (fragmentStrings.length < neededFragments) {
        msg.reply(`Please enter at least ${neededFragments} deconfession fragments.`);
    } else {
        const fragments = fragmentStrings.map(s => Buffer.from(s, 'base64'));
        msg.reply(sss.combine(fragments).toString());
    }
};

module.exports = {
    confessCommand,
    deconfessCommand,
};
