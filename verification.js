const got = require('got');

class Verifier {
    constructor(client, config) {
        this.base_guild = client.guilds.cache.get(config.guild_2025);
        this.config = config.verification;
        this.verify_cache = {};

        if (!this.base_guild) {
            throw new Error(`Could not find base guild (id ${config.guild_2025})!`);
        }
    }

    /**
     * Resolve with a nullary value, or reject with an error message.
     * @param {string} id the id of the person to check
     */
    async checkVerified(id) {
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

    verify(guildMember) {
        const guild = guildMember.guild;
        const {channel, role} = this.get_cached(guild);
        /// Don't try to verify if #landing-pad doesn't exist
        if (!channel) {
            return;
        }
        const verification = this.checkVerified(guildMember.id);
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

// I know singletons are discouraged,
// but in this case we really do only need one verifier.
// It's cleaner than passing around one per client, at any rate
let verifier = null;

const genCommands = verifier => [
    {
        name: 'verify',
        call: msg => {
            const guildMember = msg.guild.members.cache.get(msg.author.id);
            verifier.verify(guildMember);
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
                const verificationStatus = verifier.checkVerified(msg.author.id);
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
    client.on('guildMemberAdd', guildMember => verifier.verify(guildMember));

    // Commands
    return genCommands(verifier);
};
module.exports = {
    setup,
    Verifier,
};
