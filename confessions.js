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

/// TODO: 2026 confessions should be logged separately

const logConfession = async (number, confession, confessAttachments, confessor, msg, client, confessionType, mods) => {
    const secretStr = `${confessionType} #${number} by ${confessor}`;
    const secret = Buffer.from(secretStr);
    const mods = Object.keys(mods);
    const publicKeys = Object.values(mods);
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

const confessCommand = async (client, verificationChecker, channel, confessionType, msg, args) => {
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
    /// Please don't remove the verification from here unless you are completely sure users are verified by here (not true at the moment).
    const verificationStatus = verificationChecker(confessor);
    verificationStatus.then(() => {
        const fileName = `confession_counter_${channel.id}`;
        fs.readFile(fileName, 'utf8', (err, data) => {
            let number = 1 + (err ? 0 : +data);
            logConfession(number, confession, confessAttachments, confessor, msg, client, confessionType, config.server_mods);
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

/// TODO: some of the code here is repeated, could also avoid repetition by making a new function that branches out and receives 2 functions (2025 and 2026) as parameters...
/// For now, the logic is slightly different because 2026s only want `boomerconfess`

const confessCommandDisambiguator = async (client, verifier, msg, args) => {
    Promise.allSettled([verifier.isCommit.bind(verifier), verifier.is2026Admit.bind(verifier)]).then(values => {
        const is2025 = values[0].status === 'fulfilled';
        const is2026 = values[1].status === 'fulfilled';
        if (is2025) {
            confessCommand(client, verifier.isCommit.bind(verifier), client.channels.resolve(config.confessions_channel), 'Confession', msg, args);
        } else if (is2026) {
            msg.reply("This command is unavailable per 2026 mods request. Only `boomerconfess` is available");
        } else {
            msg.reply("This command is only available for people in the MIT 2025 or MIT 2026 servers. If you are, please verify. If it still doesn't work, let mods know");
        }
    });
}

const boomerconfessCommandDisambiguator = async (client, verifier, msg, args) => {
    Promise.allSettled([verifier.isCommit.bind(verifier), verifier.is2026Admit.bind(verifier)]).then(values => {
        const is2025 = values[0].status === 'fulfilled';
        const is2026 = values[1].status === 'fulfilled';
        if (is2025 && is2026 && args[0] == 'boomerconfess') {
            msg.reply("You are both a '25 and '26 so please use `boomerconfess25` or `boomerconfess26` to specify where to confess.");
        } else if (is2025 || args[0] == 'boomerconfess25') {
            confessCommand(client, verifier.isCommit.bind(verifier), client.channels.resolve(config.boomer_confessions_channel), 'Confession w/ boomers', msg, args);
        } else if (is2026 || args[0] == 'boomerconfess26') {
            confessCommand(client, verifier.is2026Admit.bind(verifier), client.channels.resolve(config.boomer_confessions_channel_2026), msg, args);
        } else {
            msg.reply("This command is only available for people in the MIT 2025 or MIT 2026 servers. If you are, please verify. If it still doesn't work, let mods know");
        }
    });
}

const tmpDebug = async (client, verifier, msg, args) => {
    Promise.allSettled([verifier.isCommit.bind(verifier), verifier.is2026Admit.bind(verifier)]).then(values => {
        console.log(values);
    });
}

const genCommands = (client, config, verifier) => [
    {
        name: 'tmpDebug',
        unprefixed: true,
        call: tmpDebug.bind(null, client, verifier),
    },
    {
        name: 'confess',
        unprefixed: true,
        call: confessCommandDisambiguator.bind(null, client, verifier),
    },
    {
        name: 'boomerconfess',
        unprefixed: true,
        call: boomerconfessCommandDisambiguator.bind(null, client, verifier),
    },
    /// TODO: remove the following lines. There for debug/migration purposes
    {
        name: 'confess25',
        unprefixed: true,
        call: confessCommand.bind(null, client, verifier.isCommit.bind(verifier), client.channels.resolve(config.confessions_channel), 'Confession'),
    }, {
        name: 'boomerconfess25',
        unprefixed: true,
        call: confessCommand.bind(null, client, verifier.isCommit.bind(verifier), client.channels.resolve(config.boomer_confessions_channel), 'Confession w/ boomers'),
    }, {
        name: 'confess26',
        unprefixed: true,
        call: msg => {
            msg.reply('Not implemented per 2026s mods request. Only `boomerconfess` is available.');
        }
    }, {
        name: 'boomerconfess26',
        unprefixed: true,
        call: confessCommand.bind(null, client, verifier.is2026Admit.bind(verifier), client.channels.resolve(config.boomer_confessions_channel_2026), 'Confession w/ boomers'),
    }, {
        name: 'deconfess',
        call: deconfessCommand.bind(null, client),
    }
];
module.exports = {
	setup: (client, config) => genCommands(client, config, new verification.Verifier(client, config)),
};
