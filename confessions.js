const fs = require('fs');
const Discord = require('discord.js');
const sss = require('shamirs-secret-sharing');
const config = require('./config');
const verification = require('./verification');

/// ENCRYPTION PENDING, WILL BE ADDED AS SOON AS ALL STAFF SEND THEIR PUBLIC KEYS
/// Accepts the base64 shamir fragment and the public key
/// Returns an encrypted string (probably base64 as well) with the encrypted shamir fragment
/// which will be sent through Discord DM
const encryptWithPublicKey = (fragment, publicKey) => {
    /// Stub: Just return the fragment for now... 
    return fragment;
}

const logConfession = async (number, confession, confessor, msg, client) => {
    const secretStr = `Confession #${number} by ${confessor}: ${confession}`;
    const secret = Buffer.from(secretStr);
    const numMods = config.server_mods.length;
    const shares = sss.split(secret, { shares: numMods, threshold: Math.ceil(numMods / 2) });
    for (let i = 0; i < shares.length; i++) {
        const fragment = shares[i].toString('base64');
        const encryptedFragment = encryptWithPublicKey(fragment, config.public_keys[i]);
        try {
            const user = await client.users.fetch(config.server_mods[i]);
            user.send(`**Confession #${number}**:\n${encryptedFragment}`);
        } catch(e) {
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
    const confession = msg.content.substr(args[0].length + 1);
    /// If the confession is just a test, don't post it
    if (confession === 'test' || confession === 'testing') {
        await msg.channel.send(`Go ahead with your confession, just write your confession instead of \`${confession}\``);
        await msg.delete();
        return;
    }
    if (msg.deletable) {
        await msg.delete();
    } else if (msg.channel.recipient !== undefined) {
        /// This is a DM channels
        msg.reply("For additional security, please delete your confession and this message asking you to delete your confession");
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
            fs.writeFileSync('confession_counter', number.toString());
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