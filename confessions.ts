import fs = require('fs');
import sss = require('shamirs-secret-sharing-ts');
import config = require('./config');
import verification = require('./verification');
import crypto = require('crypto');

import type { Client, TextChannel, Message, MessageAttachment, Snowflake } from 'discord.js';

interface ConfessionsChannelPrefs {
    command: string,
    description: string, // i.e. "Confession w/boomers"
    guild: Snowflake,
    channel: Snowflake,
    role: Snowflake | undefined, // set to undefined to only check if the user is in the server
    mods: ModMap,
}


interface ConfessionsSetup {
    confessions_channels: ConfessionsChannelPrefs[],

    // Legacy options
    // TODO: phase out and figure out a way of still doing the disambiguation code
    confessions_channel: Snowflake,
    confessions_channel_2026: Snowflake,
    boomer_confessions_channel: Snowflake,
    boomer_confessions_channel_2026: Snowflake,
    server_mods: ModMap,
    server_mods_2026: ModMap,
}

interface ModMap {
	[key: Snowflake]: string | null;
}

type ConfessionType = 'Confession' | 'Confession w/ boomers';

type VerifierFn = (id: Snowflake) => Promise<void>;

/// Accepts the base64 shamir fragment and the public key
/// Returns an encrypted string (probably base64 as well) with the encrypted shamir fragment
/// which will be sent through Discord DM
const encryptWithPublicKey = (fragment: string, publicKey: string) => {
    const buffer = Buffer.from(fragment, 'utf8');
    const encrypted = crypto.publicEncrypt(publicKey, buffer);
    return encrypted.toString('base64');
}

/// TODO: 2026 confessions should be logged separately

const zip = <T, U>(a: T[], b: U[]) => a.map((x, i) => [x, b[i]]);

const logConfession = async (number: number, confession: string, confessAttachments: MessageAttachment[], confessor: Snowflake, msg: Message, client: Client, confessionType: ConfessionType, modsDict: ModMap) => {
    const pepper = Math.random().toString(36).substring(2); // randomly generated string, from https://gist.github.com/6174/6062387
    const secretStr = `${confessionType} #${number} by ${confessor} [ignore: ${pepper}]`;
    const secret = Buffer.from(secretStr);
    const mods = Object.keys(modsDict);
    const publicKeys = Object.values(modsDict);
    const numMods = mods.length;
    const shares = sss.split(secret, { shares: numMods, threshold: Math.floor(numMods / 2) + 1 });
    for (const [mod, share] of zip(mods, shares)) {
        const pubkey = modsDict[mod];
        const fragment = `Confession #${number} fragment decrypted successfully: ${share.toString('base64')}`;
        let encryptedFragment = '*__ERROR__: No encrypted fragment.*';
        if (pubkey === null) {
            encryptedFragment = `${share.toString('base64')}\n*__WARNING__: No public key provided. Confessions are encrypted but they're not protected against potential Discord token leaks.*`
        } else {
            encryptedFragment = encryptWithPublicKey(fragment, pubkey);
        }
        
        try {
            const user = await client.users.fetch(mod);
            user.send(`**${confessionType} #${number}**: ||${encryptedFragment}||`);
            if(confessAttachments.length > 0){
                user.send({
                    content: `${confession}`,
                    files: confessAttachments
                });
            } else {
                user.send(`${confession}`);
            }
        } catch (e) {
            msg.reply((e as any).toString());
        }
    }
};

/**
 * Confess command
 * @param {Message} msg 
 * @param {Array<String>} args 
 * @param {Client} client 
 */

const confessCommand = async (client: Client, verificationChecker: VerifierFn, channel: TextChannel, confessionType: ConfessionType, modsDict: ModMap, msg: Message, args: string[]) => {
    // TODO: Move this body into a class so we can persist some state
    const confessor = msg.author.id;

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

    /// Please don't remove the verification from here unless you are completely sure users are verified by here (not true at the moment).
    const verificationStatus = verificationChecker(confessor);
    verificationStatus.then(() => {
        const fileName = `confession_counter_${channel.id}`;
        fs.readFile(fileName, 'utf8', (err, data) => {
            let number = 1 + (err ? 0 : +data);
            logConfession(number, confession, confessAttachments, confessor, msg, client, confessionType, modsDict);
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

const deconfessCommand = (client: Client, force: Boolean, msg: Message, args: string[]) => {
    const fragmentStrings = args.slice(1);
    const numMods = Object.keys(config.server_mods).length;
    const neededFragments = Math.ceil(numMods / 2);
    if (!force && fragmentStrings.length < neededFragments) {
        msg.reply(`Please enter at least ${neededFragments} deconfession fragments. If this number is wrong (i.e. this was before more mods were added), try tim.forcedeconfess`);
    } else {
        const fragments = fragmentStrings.map(s => Buffer.from(s, 'base64'));
        msg.reply(sss.combine(fragments).toString());
    }
};

/// TODO: some of the code here is repeated, could also avoid repetition by making a new function that branches out and receives 2 functions (2025 and 2026) as parameters...
/// For now, the logic is slightly different because 2026s only want `boomerconfess`

const generateConfessionsCommand = (client: Client, verificationFn: VerifierFn, channelId: Snowflake, prefix: string, mods: ModMap) => {
    return confessCommand.bind(null, client, verificationFn, client.channels.resolve(channelId) as TextChannel, prefix, mods);
}

/// Get the confessions command from the config list item
const confessionsCommandFromPrefs = (client: Client, prefs: ConfessionsChannelPrefs) => {
    return generateConfessionsCommand(client, verification.generateVerifierFn(client, prefs.guild, prefs.role), prefs.channel, prefs.description, prefs.mods);
}

const confessCommandDisambiguator = async (client: Client, verifier: verification.Verifier, msg: Message, args: string[]) => {
    Promise.allSettled([verifier.is2025Commit(msg.author.id), verifier.is2026Commit(msg.author.id)]).then(values => {
        const is2025 = values[0].status === 'fulfilled';
        const is2026 = values[1].status === 'fulfilled';
        if (is2025) {
            generateConfessionsCommand(client, verifier.is2025Commit.bind(verifier), config.confessions_channel, 'Confession', config.server_mods)(msg, args);
        } else if (is2026) {
            generateConfessionsCommand(client, verifier.is2026Commit.bind(verifier), config.confessions_channel_2026, 'Confession', config.server_mods_2026)(msg, args);
        } else {
            msg.reply("This command is only available for people in the MIT 2025 or MIT 2026 servers. If you are, please verify. If it still doesn't work, let mods know");
        }
    });
}

const boomerconfessCommandDisambiguator = async (client: Client, verifier: verification.Verifier, msg: Message, args: string[]) => {
    Promise.allSettled([verifier.is2025Commit(msg.author.id), verifier.is2026Commit(msg.author.id)]).then(values => {
        const is2025 = values[0].status === 'fulfilled';
        const is2026 = values[1].status === 'fulfilled';
        if (is2025 && is2026 && args[0] == 'boomerconfess') {
            msg.reply("You are both a '25 and '26 so please use `boomerconfess25` or `boomerconfess26` to specify where to confess.");
        } else if (is2025 || args[0] == 'boomerconfess25') {
            generateConfessionsCommand(client, verifier.is2025Commit.bind(verifier), config.boomer_confessions_channel, 'Confession w/ boomers', config.server_mods)(msg, args);
        } else if (is2026 || args[0] == 'boomerconfess26') {
            generateConfessionsCommand(client, verifier.is2026Commit.bind(verifier), config.boomer_confessions_channel_2026, 'Confession w/ boomers', config.server_mods_2026)(msg, args);
        } else {
            msg.reply("This command is only available for people in the MIT 2025 or MIT 2026 servers. If you are, please verify. If it still doesn't work, let mods know");
        }
    });
}

const genCommands = (client: Client, config: ConfessionsSetup, verifier: verification.Verifier) => [
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
    ...config.confessions_channels.map((prefs) => ({
        name: prefs.command,
        unprefixed: true,
        call: confessionsCommandFromPrefs(client, prefs),
    })), 
    {
        name: 'deconfess',
        call: deconfessCommand.bind(null, client, false),
    },
    {
        name: 'forcedeconfess',
        call: deconfessCommand.bind(null, client, true)
    }
];
module.exports = {
	setup: (client: Client, config: any) => genCommands(client, config as ConfessionsSetup, new verification.Verifier(client, config)),
};
