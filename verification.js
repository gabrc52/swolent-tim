const Discord = require('discord.js');
const config = require('./config');

const isVerified = (id, client) => {
    const guild = client.guilds.cache.get(config.guild_2025);
    const guildMember = guild.members.cache.get(id);
    if (guildMember === undefined) {
        return "You're not in the MIT 2025 server."
    } else {
        const role = guildMember.roles.cache.get(config.verified_role);
        if (role === undefined) {
            return "Swole Tim hasn't verified you in the MIT 2025 server. Please follow the instructions to verify there."
        } else {
            return true;
        }
    }
};

const verify = (guildMember, client) => {
    const guild = guildMember.guild;
    const verification = isVerified(guildMember.id, client);
    const channel = guild.channels.cache.find(c => c.name === 'landing-pad');
    if (verification === true) {
        const verifiedRole = guild.roles.cache.find(r => r.name === 'verified');
        if (verifiedRole === undefined) {
            channel.send(`Could not find verified role in ${guild.name}`);
        } else {
            guildMember.roles.add(verifiedRole);
        }
    } else {
        channel.send(`${guildMember}: ${verification}`);
    }
};

module.exports = {
    isVerified: isVerified,
    verify: verify,
};