const Discord = require('discord.js');
const got = require('got');
const config = require('./config');
const fs = require('fs');
const verification = require('./verification');

module.exports = {
    'tim.verify': (msg, args, client) => {
        const guildMember = msg.guild.members.cache.get(msg.author.id);
        verification.verify(guildMember, client);
    },
    'tim.ping': msg => {
        msg.channel.send(`Pong, ${msg.author}! The channel is ${msg.channel}.`);
    },
    'tim.taken': async (msg, args) => {
        if (msg.content.trim() === 'tim.taken') {
            msg.reply("Please specify a possible kerb to know if it's taken or not (for example: `tim.taken stress`).");
        } else {
            const possibleUser = args[1];
            /// https://www.twilio.com/blog/5-ways-to-make-http-requests-in-node-js-using-async-await
            try {
                const response = await got(`https://rgabriel.scripts.mit.edu/taken.php?name=${possibleUser}`);
                msg.channel.send(`${response.body}`);
            } catch (e) {
                console.error(`${e}`);
                msg.channel.send(`${e}`);
            }
        }
    },
    'tim.listinfo': async (msg, args) => {
        if (msg.content.trim() === 'tim.listinfo') {
            msg.reply("Please specify a mailing list to see its info (for example: `tim.listinfo plont`).");
        } else {
            const list = args[1];
            try {
                const response = await got(`https://rgabriel.scripts.mit.edu/listinfo.php?name=${list}`);
                msg.channel.send(`${response.body}`);
            } catch (e) {
                console.error(e);
                msg.channel.send(`${e}`);
            }
        }
    },
    'tim.time': msg => {
        msg.channel.send(`The time is ${new Date()}`);
    },
    'tim.cwd': msg => {
        msg.channel.send(`The working directory is ${process.cwd()}`);
    },
    'whitelist': async (msg, args, client) => {
        if (msg.content.trim() === 'whitelist') {
            msg.reply("Please specify a username after `whitelist` to get whitelisted");
        } else {
            const username = args[1];
            const url = `https://rgabriel.scripts.mit.edu/mc/prefrosh.php?name=${username}&discord=${msg.author.id}`;
            const verificationStatus = verification.isVerified(msg.author.id, client);
            if (verificationStatus === true) {
                const response = await got(url);
                msg.channel.send(`${response.body}`);
            } else {
                msg.reply(`${verificationStatus} If you're not a prefrosh, go to https://mitcraft.ml to get whitelisted. Go to #help if you're having trouble.`);
            }
        }
    },
    'confess': (msg, args, client) => {
        if (msg.deletable) {
            msg.delete();
        } else {
            msg.reply("Could not delete message, either the permissions are wrong, or this is a DM channel. Please delete manually.");
        }
        const confession = msg.content.substr(8);
        const confessor = msg.author.id;
        const guild = client.guilds.cache.get(config.guild_2025);
        const channel = guild.channels.resolve(config.confessions_channel);
        const verificationStatus = verification.isVerified(confessor, client);
        let number;
        fs.readFile('confession_counter', 'utf8', (err, data) => {
            if (err) {
                number = 1;
            } else {
                data++;
                number = data;
            }
            fs.writeFileSync('confession_counter', number);
            if (verificationStatus === true) {
                const embed = new Discord.MessageEmbed()
                    .setAuthor(`Confession #${number}`)
                    .setColor(config.embed_color)
                    .setDescription(confession);
                channel.send(embed);
            } else {
                msg.reply(`Can't confess: ${verificationStatus}`);
            }
        }
        );
    },
};