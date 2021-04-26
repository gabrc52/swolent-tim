const got = require('got');
const verification = require('./verification');
const confessions = require('./confessions');
const breakout = require('./breakout');
const { exec } = require("child_process");

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
            verificationStatus
                .then(() => got(url).then(response => msg.channel.send(`${response.body}`)))
                .catch(error => msg.reply(`${error} If you're not a prefrosh, go to https://mitcraft.ml to get whitelisted. Go to #help if you're having trouble.`));
        }
    },
    'confess': confessions.confessCommand,
    'boomerconfess': confessions.boomerConfessCommand,
    'c': confessions.confessCommand,
    'bc': confessions.boomerConfessCommand,
    'tim.confess': confessions.confessCommand,
    'tim.deconfess': confessions.deconfessCommand,
    'tim.fillTheBreakoutRooms': async (msg, args, client) => {
        msg.reply('Ok, filling breakout rooms...');
        await breakout.fillBreakoutRooms(client);
    },
    'tim.revision': (msg, _args, _client) => {
        exec('git rev-parse HEAD', (error, stdout, stderr) => {
            if (error) {
                msg.reply(`Error getting revision:\n${stderr}`);
            } else {
                msg.reply(stdout.substr(0, 7));
            }
        });
    },
};
