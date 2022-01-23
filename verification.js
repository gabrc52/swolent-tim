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
     * Check if Discord user is verified as admitted to the member of the class of 2026.
     * @param {string} id the id of the person to check 
     */
    async is2026Admit(id) {
        const guildMember = this.guild_2026.members.cache.get(id);
        if (!guildMember) {
            throw "You're not in the MIT 2026 server."
        } else {
            const role = guildMember.roles.cache.get(this.config.admitted_role_2026);
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

    // TODO: move this to checking for comMIT instead of adMIT

    verify(guildMember) {
        const guild = guildMember.guild;
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

const getVerifyLink = id => {
    return `https://discord2025.scripts.mit.edu:444/verify.php?id=${id}&auth=${sha256(`${pepper}:${id}`)}`;
}

// I know singletons are discouraged,
// but in this case we really do only need one verifier.
// It's cleaner than passing around one per client, at any rate
let verifier = null;

const sendVerificationDm = user => {
    user.send(`To verify that you're a comMIT please click on the following link: ${getVerifyLink(user.id)}`);
};

const genCommands = (verifier, config) => [
    {
        name: 'verify',
        call: msg => {
            const id = msg.author.id;
            if (msg.channel.type === 'dm' || msg.guild.id == config.guild_2025) {
                sendVerificationDm(msg.author);
            } else {
                const guildMember = msg.guild.members.cache.get(id);
                verifier.verify(guildMember);
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
                const url = `https://rgabriel.scripts.mit.edu/mc/prefrosh.php?name=${username}&discord=${msg.author.id}`;
                const verificationStatus = verifier.is2026Admit(msg.author.id);
                verificationStatus
                    .then(() => got(url).then(response => msg.channel.send(`${response.body}`)))
                    .catch(error => msg.reply(`${error} If you're not a prefrosh, go to https://mitcraft.ml to get whitelisted. Go to #help if you're having trouble.`));
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
    });
    client.on('messageReactionAdd', (reaction, user) => {
        if (reaction.emoji.name === 'verifyme') {
            sendVerificationDm(user);
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
