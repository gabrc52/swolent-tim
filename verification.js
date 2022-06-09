const got = require('got');
const pepper = require('./pepper');
const sha256 = require('js-sha256').sha256;

class Verifier {
    constructor(client, config) {
        this.base_guild = client.guilds.cache.get(config.guild_2025);
        this.guild_2026 = client.guilds.cache.get(config.guild_2026);
        this.config = config.verification;
        this.verify_cache = {};

        if (!this.base_guild) {
            throw new Error(`Could not find base guild (id ${config.guild_2025})!`);
        }
    }

    /**
     * Check if a Discord user has been verified as an comMIT by Swole Tim
     * Resolve with a nullary value, or reject with an error message.
     * @param {string} id the id of the person to check
     */
    async isCommit(id) {
        const guildMember = this.base_guild.members.cache.get(id);
        if (!guildMember) {
            throw "You're not in the MIT 2025 server."
        } else {
            const role = guildMember.roles.cache.get(this.config.verified_role);
            if (!role) {
                throw "Swole Tim hasn't verified you in the MIT 2025 server. Please follow the instructions to verify there."
            }
        }
    }

    // TODO: Essentially copy-paste function. Maybe make it not reuse code so much?
    /**
     * Check if Discord user is verified as commited to the member of the class of 2026.
     * @param {string} id the id of the person to check 
     */
    async is2026Commit(id) {
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

    get_cached(guild) {
        // ensure entry exists
        this.verify_cache[guild.id] = (this.verify_cache[guild.id] || {});
        const cached = this.verify_cache[guild.id];
        // if they don't exist, try populating them
        cached.channel = (cached.channel || guild.channels.cache.find(c => c.name === this.config.target_channel));
        cached.role = (cached.role || guild.roles.cache.find(r => r.name === this.config.target_role));
        // return the values we got
        return cached;
    }

    /// For automatic verification based on your roles in 2025/2026 server
    verify(guildMember) {
        const guild = guildMember.guild;
        if (guild.id == this.config.guild_2025) {
            /// Give 2026 role to 2026s who join the 2025 server
            const verification = this.is2026Commit(guildMember.id);
            verification.then(() => {
                guildMember.roles.add(this.config.role_for_2026s_in_2025_server);
            });
        } else {
            /// Give verified role to 2025s who join 2025-affiliated servers
            const { channel, role } = this.get_cached(guild);
            /// Don't try to verify if #landing-pad doesn't exist
            if (!channel) {
                return;
            }
            const verification = this.isCommit(guildMember.id);
            verification.then(() => {
                if (role) {
                    guildMember.roles.add(role);
                } else {
                    channel.send(`Could not find verified role in ${guild.name}`);
                }
            }).catch(error => {
                channel.send(`${guildMember}: ${error}`);
            });
        }
    }
}

/**
 * Get a verification link for the Discord user
 * @param {*} id Discord ID of the person verifying
 * @param {*} classOf Class of the person verifying (2025 or 2026)
 * @returns The link that will verify this specific user
 */
const getVerifyLink = (id, classOf) => {
    return `https://discord2025.mit.edu:444/verify${classOf}.php?id=${id}&auth=${sha256(`${pepper}:${id}`)}`;
}

// I know singletons are discouraged,
// but in this case we really do only need one verifier.
// It's cleaner than passing around one per client, at any rate
let verifier = null;

const sendVerificationDm = (user, classOf) => {
    user.send(`To verify that you're a comMIT please click on the following link: ${getVerifyLink(user.id, classOf)}`);
};

const genCommands = (verifier, config) => [
    {
        name: 'verify',
        call: msg => {
            const id = msg.author.id;
            if (msg.channel.type === 'dm' || msg.guild.id == config.guild_2025) {
                sendVerificationDm(msg.author, 2025);
            } else {
                const guildMember = msg.guild.members.cache.get(id);
                verifier.verify(guildMember);
            }
        }
    }, {
        name: 'verify26',
        unprefixed: true,
        call: msg => {
            if (msg.guild.id == config.guild_2025) {
                const verification = verifier.is2026Commit(msg.author.id);
                verification
                    .then(() => {
                        const guildMember = msg.guild.members.cache.get(id);
                        guildMember.roles.add(config.role_for_2026s_in_2025_server);
                    })
                    .catch(error => {
                        msg.reply('To get verified as a 2026 here, get verified in the 2026 server first.')
                    });
            } else {
                sendVerificationDm(msg.author, 2026);
            }
        }
    }, {
        name: 'whitelist',
        unprefixed: true,
        call: (msg, args) => {
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
    }
];

const setup = (client, config) => {
    if (verifier) {
        throw new Error("Verifier already setup!");
    }
    verifier = new Verifier(client, config);
    client.on('guildMemberAdd', guildMember => {
        verifier.verify(guildMember);

        if (member.guild.id == config.guild_2025) {
            member.send(`Hi! I'm Tim. In order to get verified as a member of the class of 2025, please click on the following link:
    
${getVerifyLink(member.id, 2025)}
    
Once you're in the server, please check out #rules-n-how-to-discord, get roles in #roles, and don't forget to introduce yourself to your fellow adMITs in #introductions!`);
        }
    
        if (member.guild.id == config.guild_intl) {
            member.send(`Hi! I'm Tim. To get access to the MIT Internationals server, please click on the following link:
    
${getVerifyLink(member.id, '')}`);
        }
    });
    client.on('messageReactionAdd', (reaction, user) => {
        if (reaction.emoji.name === 'verifyme') {
            if (reaction.message.guild.id == config.guild_2025) {
                sendVerificationDm(user, 2025);
            } else if (reaction.message.guild.id == config.guild_intl) {
                sendVerificationDm(user, '');
            } else if (reaction.message.guild.id == config.guild_2026) {
                sendVerificationDm(user, 2026);
            }
        }
    });
    // Commands
    return genCommands(verifier, config);
};
module.exports = {
    setup,
    Verifier,
    getVerifyLink,
};
