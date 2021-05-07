const config = require('./config');

// We use a promise here because it's the closest thing JS has to an either type.
// It's better than polymorphing on string vs true, at least?
const isVerified = async (id, client) => {
    const guild = client.guilds.cache.get(config.guild_2025);
    const guildMember = guild.members.cache.get(id);
    if (!guildMember) {
        throw "You're not in the MIT 2025 server."
    } else {
        const role = guildMember.roles.cache.get(config.verified_role);
        if (!role) {
            throw "Swole Tim hasn't verified you in the MIT 2025 server. Please follow the instructions to verify there."
        }
    }
};

const verify = (guildMember, client) => {
    const guild = guildMember.guild;
    const verification = isVerified(guildMember.id, client);
    const channel = guild.channels.cache.find(c => c.name === 'landing-pad');
    verification.then(() => {
        const verifiedRole = guild.roles.cache.find(r => r.name === 'verified');
        if (!verifiedRole) {
            if (channel) {
                channel.send(`Could not find verified role in ${guild.name}`);
            }
        } else {
            guildMember.roles.add(verifiedRole);
        }
    }).catch(error => {
        if (channel) {
            channel.send(`${guildMember}: ${error}`);
        }
    });
};

module.exports = {
    isVerified: isVerified,
    verify: verify,
};
