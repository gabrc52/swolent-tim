import got from 'got';
import pepper = require('./pepper');
import { sha256 } from "js-sha256";

import type { Client, Guild, GuildMember, Message, MessageReaction, Role, Snowflake, TextChannel, User, PartialUser } from "discord.js";
import * as fs from 'fs';

interface VerifySetup {
    guild_2025: Snowflake,
    guild_2026: Snowflake,
    verification: VerifyConfig,
}

interface VerifyConfig {
    guild_2025: Snowflake,
    role_for_2026s_in_2025_server: Snowflake,
    guild_2026: Snowflake,
    verified_role: Snowflake,
    verified_role_2026: Snowflake,
    target_channel: Snowflake,
    target_role: Snowflake,
}

interface CacheEntry {
    channel: TextChannel,
    role: Role,
}

/**
 * there are 3 verification types:
 *   - 2025/26 verification: they will send you to `verify2025.php` or `verify2026.php`, for '25/'26 server
 *   - 2025-affiliated servers verification: automatically give verified role to people in other '25 servers
 *   - general kerb verification: for any other MIT server. will currently give verified role to anyone with a kerb
 *       the idea is to add moira list verification so more groups can use it
 *       because for now otherwise there would be little point because busy beavers et al now just verify people who are in the discord student hub
 */

// TODO: maybe separate the code into different classes? like the main class would be `Verifier` 
// but the code could be in 3 other classes
// And also, some of the code is in `bot.ts`, so uh, yeah.
export class Verifier {
    base_guild: Guild;
    guild_2026: Guild;
    config: VerifyConfig;
    verify_cache: { [key: string]: CacheEntry };

    constructor(client: Client, config: VerifySetup) {
        this.base_guild = client.guilds.cache.get(config.guild_2025)!;
        this.guild_2026 = client.guilds.cache.get(config.guild_2026)!;
        this.config = config.verification;
        this.verify_cache = {};

        if (!this.base_guild) {
            throw new Error(`Could not find base guild (id ${config.guild_2025})!`);
        }
    }

    /**
     * Gets the list of servers that have kerb verification enabled (i.e. any kerb)
     */
    async getKerbVerificationServers(): Promise<string[]> {
        const json: string = fs.readFileSync('servers.json', 'utf8');
        const dict: object = JSON.parse(json);
        const servers: string[] = [];
        for (const [server, props] of Object.entries(dict)) {
            if (props !== undefined && props['enabled']) {
                servers.push(server);
            }
        }
        return servers;
    }

    async setKerbVerificationConfig(serverId: string, key: 'enabled' | 'role' | 'moira' | 'message', value: any) {
        let json: string = fs.readFileSync('servers.json', 'utf8');
        const dict: any = JSON.parse(json); // TODO: use stronger type annotation
        if (dict[serverId] === undefined) {
            dict[serverId] = {};
        }
        dict[serverId][key] = value;
        json = JSON.stringify(dict);
        fs.writeFileSync('servers.json', json);
    }

    /**
     * Enables kerb verification for server `serverId`
     * @param serverId discord id of the server
     */
    async enableKerbVerification(serverId: string) {
        await this.setKerbVerificationConfig(serverId, 'enabled', true);
    }

    /**
     * Disables kerb verification for server `serverId`
     * @param serverId discord id of the server
     */
    async disableKerbVerification(serverId: string) {
        await this.setKerbVerificationConfig(serverId, 'enabled', false);
    }

    /**
     * Set verified role for server
     * @param serverId discord id of the server
     * @param roleId discord id of the role
     */
    async setKerbVerificationRole(serverId: string, roleId: string) {
        await this.setKerbVerificationConfig(serverId, 'role', roleId);
    }

    /**
     * Set message to reply to recently verified user for server
     * @param serverId discord id of the server
     * @param message message
     */
    async setKerbVerificationSuccessMessage(serverId: string, message: string) {
        await this.setKerbVerificationConfig(serverId, 'message', message);
    }

    /** 
     * Set moira list to check against. If undefined, will check for any kerb.
     * @param serverId discord id of the server
     * @param list name of the moira list for allowed members
     */
    async setKerbVerificationMoiraList(serverId: string, list: string | undefined) {
        /// TODO: implement this on the server side so it actually does something
        await this.setKerbVerificationConfig(serverId, 'moira', list);
    }

    /**
     * Check if a Discord user has been verified as an comMIT by Swole Tim
     * Resolve with a nullary value, or reject with an error message.
     * @param {string} id the id of the person to check
     */
    async is2025Commit(id: Snowflake) {
        const guildMember = this.base_guild.members.cache.get(id);
        if (!guildMember) {
            throw "You're not in the MIT 2025 server.";
        } else {
            const role = guildMember.roles.cache.get(this.config.verified_role);
            if (!role) {
                throw "Swole Tim hasn't verified you in the MIT 2025 server. Please follow the instructions to verify there.";
            }
        }
    }

    // TODO: Essentially copy-paste function. Maybe make it not reuse code so much?
    /**
     * Check if Discord user is verified as commited to the member of the class of 2026.
     * @param {string} id the id of the person to check 
     */
    async is2026Commit(id: Snowflake) {
        const guildMember = this.guild_2026.members.cache.get(id);
        if (!guildMember) {
            throw "You're not in the MIT 2026 server."
        } else {
            const role = guildMember.roles.cache.get(this.config.verified_role_2026);
            if (!role) {
                throw "Swole Tim hasn't verified you in the MIT 2026 server. Please follow the instructions to verify there."
            }
        }
    }

    get_cached(guild: Guild) {
        // ensure entry exists
        this.verify_cache[guild.id] = (this.verify_cache[guild.id] || {});
        const cached = this.verify_cache[guild.id];
        // if they don't exist, try populating them
        cached.channel = (cached.channel || guild.channels.cache.find(c => c.name === this.config.target_channel) as TextChannel); // TODO check cast
        cached.role = (cached.role || guild.roles.cache.find(r => r.name === this.config.target_role));
        // return the values we got
        return cached;
    }

    async verify(guildMember: GuildMember) {
        const guild = guildMember.guild;
        if (guild == this.base_guild) {
            /// Give 2026 role to 2026s who join the 2025 server
            try {
                await this.is2026Commit(guildMember.id);
                const role_2026 = guild.roles.resolve(this.config.role_for_2026s_in_2025_server)!; // TODO check cast
                guildMember.roles.add(role_2026);
                return true;
            } catch (e) {
                console.log(e);
                return false;
            }
        } else {
            /// Give verified role to 2025s who join 2025-affiliated servers
            const { channel, role } = this.get_cached(guild);
            /// Don't try to verify if #landing-pad doesn't exist
            if (!channel) {
                return;
            }
            try {
                await this.is2025Commit(guildMember.id);
                if (role) {
                    guildMember.roles.add(role);
                    return true;
                } else {
                    channel.send(`Could not find verified role in ${guild.name}`);
                    return false;
                }
            } catch (error) {
                channel.send(`${guildMember}: ${error}`);
                return false;
            }
        }
    }
}

/**
 * Get a verification link for the Discord user
 * @param {*} id Discord ID of the person verifying
 * @param {*} classOf Class of the person verifying (2025 or 2026)
 * @returns The link that will verify this specific user
 */
export const getClassVerifyLink = (id: string, classOf: string) => {
    return `https://discord2025.mit.edu:444/verify${classOf}.php?id=${id}&auth=${sha256(`${pepper}:${id}`)}`;
}

export const getVerifyLink = (id: string, serverId: string) => {
    return `https://discord2025.mit.edu:444/verify.php?id=${id}&server=${serverId}&auth=${sha256(`${pepper}:${id}`)}`;
}

// I know singletons are discouraged,
// but in this case we really do only need one verifier.
// It's cleaner than passing around one per client, at any rate
let verifier: Verifier | null = null;

const sendClassVerificationDm = (user: User | PartialUser, classOf: string) => {
    user.send(`To verify that you're a comMIT please click on the following link: ${getClassVerifyLink(user.id, classOf)}`);
};

const sendVerificationDm = (user: User | PartialUser, serverId: string) => {
    user.send(`To get access to the server please click on the following link: ${getVerifyLink(user.id, serverId)}`);
}

const genCommands = (verifier: Verifier, config: VerifySetup) => [
    {
        name: 'verify',
        call: (msg: Message) => {
            const id = msg.author.id;
            if (msg.channel.type === 'dm' || msg.guild?.id == config.guild_2025) {
                sendClassVerificationDm(msg.author, '2025');
            } else {
                const guildMember = msg.guild?.members.cache.get(id);
                if (guildMember) {
                    verifier.verify(guildMember);
                }
            }
        }
    }, {
        name: 'whitelist',
        unprefixed: true,
        call: (msg: Message, args: string[]) => {
            if (!args[1]) {
                msg.reply("Please specify a username after `whitelist` to get whitelisted");
            } else {
                const username = args[1];
                const id = msg.author.id;
                const url = `https://rgabriel.mit.edu/mc/prefrosh.php?name=${username}&discord=${id}&auth=${pepper}`;
                const verificationStatus = verifier.is2026Commit(id);
                if (id == '600463130174423053') {
                    msg.reply('Almost done! To finish verifying, go to the following link: https://mitcraft.ml/prefrosh');
                } else {
                    verificationStatus
                        .then(() => got(url).then(response => msg.channel.send(`${response.body}`)))
                        .catch(error => msg.reply(`${error} If you're not a prefrosh, go to https://mitcraft.ml to get whitelisted. Go to #help if you're having trouble.`));
                }
            }
        }
    }, {
        name: 'enableVerification',
        call: async (msg: Message) => {
            /// TODO: ensure admin or mod for all these commands
            if (msg.guild != null) {
                try {
                    const id: string = msg.guild.id;
                    await verifier.enableKerbVerification(id);
                    const { role } = verifier.get_cached(msg.guild);
                    if (role === undefined) {
                        msg.reply('Please create a role called "verified" to give to people once they verify');
                    } else {
                        await verifier.setKerbVerificationRole(id, role.id);
                        msg.reply(`Verification has been enabled for ${msg.guild.name}`);
                    }
                } catch (e) {
                    msg.reply(`${e}`);
                }
            }
        },
    }, {
        name: 'disableVerification',
        call: async (msg: Message) => {
            if (msg.guild != null) {
                const id: string = msg.guild.id;
                await verifier.disableKerbVerification(id);
                msg.reply(`Verification has been disabled for ${msg.guild.name}`);
            }
        }
    }, {
        name: 'setVerificationRole',
        call: async (msg: Message, args: string[]) => {
            if (msg.guild != null) {
                if (!args[1]) {
                    msg.reply("Please specify a role id for the verified role id.")
                } else {
                    await verifier.setKerbVerificationRole(msg.guild.id, args[1])
                }
            }
        }
    }, {
        name: 'setVerificationMoiraList',
        call: async (msg: Message, args: string[]) => {
            if (msg.guild != null) {
                if (!args[1]) {
                    msg.reply("Please specify a moira list to check against.")
                } else {
                    await verifier.setKerbVerificationMoiraList(msg.guild.id, args[1])
                }
            }
        }
    }, {
        name: 'getVerificationServers',
        call: async (msg: Message) => {
            const servers: string[] = await verifier.getKerbVerificationServers();
            msg.reply(servers.toString());
        }
    }
];

const setup = (client: Client, config: any) => {
    if (verifier) {
        throw new Error("Verifier already setup!");
    }
    verifier = new Verifier(client, config as VerifySetup);
    client.on('guildMemberAdd', async (member: GuildMember) => {
        const roleSuccess = await verifier!.verify(member);

        /// don't make 2026s get a DM asking them to verify as 2025s
        if (roleSuccess) {
            return;
        }

        if (member.guild.id == config.guild_2025) {
            member.send(`Hi! I'm Tim. In order to get verified as a member of the class of 2025, please click on the following link:
    
${getClassVerifyLink(member.id, '2025')}
    
Once you're in the server, please check out #rules-n-how-to-discord, get roles in #roles, and don't forget to introduce yourself to your fellow adMITs in #introductions!`);
        }

        const kerbVerificationServers = await verifier!.getKerbVerificationServers();
        if (kerbVerificationServers.includes(member.guild.id)) {
            member.send(`Hi! I'm Tim. To get access to "${member.guild.name}", please click on the following link:
    
${getVerifyLink(member.id, member.guild.id)}`);
        }
    });
    client.on('messageReactionAdd', (reaction: MessageReaction, user: User | PartialUser) => {
        if (reaction.emoji.name === 'verifyme') {
            const rxn_id = reaction.message.guild?.id;
            if (rxn_id == config.guild_2025) {
                sendClassVerificationDm(user, '2025');
            } else if (rxn_id == config.guild_2026) {
                sendClassVerificationDm(user, '2026');
            } else if (reaction.message.guild != null) {
                sendVerificationDm(user, reaction.message.guild.id);
            }
        }
    });
    // Commands
    return genCommands(verifier, config);
};
module.exports = {
    setup,
    Verifier,
    getVerifyLink: getClassVerifyLink,
};
