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

const logConfession = async (number, confession, confessAttachments, confessor, msg, client, confessionType) => {
    const secretStr = `${confessionType} #${number} by ${confessor}`;
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
            user.send(`**${confessionType} #${number}**: ${encryptedFragment}`);
            if(confessAttachments.length > 0){
                user.send({
                    content: `${confession}`,
                    files: confessAttachments
                });
            } else {
                user.send(`${confession}`);
            }
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

const confessCommand = async (client, verifier, channel, confessionType, msg, args) => {
    // TODO: Move this body into a class so we can persist some state
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
    let confessAttachments = msg.attachments.array();

    const confessor = msg.author.id;
    const verificationStatus = verifier.isCommit(confessor);
    verificationStatus.then(() => {
        const fileName = `confession_counter_${channel.id}`;
        fs.readFile(fileName, 'utf8', (err, data) => {
            let number = 1 + (err ? 0 : +data);
            logConfession(number, confession, confessAttachments, confessor, msg, client, confessionType);
            fs.writeFileSync(fileName, number.toString());
            // const confessionMsg = new Discord.MessageEmbed()
            //     .setAuthor(`${confessionType} #${number}`)
            //     .setColor(config.embed_color)
            //     .setDescription(confession);
            const confessionMsg = `**#${number}**: ${confession}`;
            if (confessAttachments.length > 0){
                channel.send({
                    content: confessionMsg,
                    files: confessAttachments
                });
            } else {
                channel.send(confessionMsg);
            }
        });
    }).catch(error => msg.reply(`Can't confess: ${error}`));
};

const deconfessCommand = (client, msg, args) => {
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

const genCommands = (client, config, verifier) => [
    {
        name: 'confess',
        unprefixed: true,
        call: confessCommand.bind(null, client, verifier, client.channels.resolve(config.confessions_channel), 'Confession'),
    }, {
        name: 'boomerconfess',
        unprefixed: true,
        call: confessCommand.bind(null, client, verifier, client.channels.resolve(config.boomer_confessions_channel), 'Confession w/ boomers'),
    }, {
        name: 'deconfess',
        call: deconfessCommand.bind(null, client),
    }
];
module.exports = {
	setup: (client, config) => genCommands(client, config, new verification.Verifier(client, config)),
};
