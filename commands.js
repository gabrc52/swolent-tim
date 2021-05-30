const got = require('got');
const pepper = require('./pepper');
const breakout = require('./breakout');
const { exec } = require("child_process");

const setup = (client, config) => [
    {
        name: 'ping',
        call: msg => {
            msg.channel.send(`Pong, ${msg.author}! The channel is ${msg.channel}.`);
        }
    }, {
        name: 'taken',
        call: async (msg, args) => {
            if (!args[1]) {
                msg.reply("Please specify a possible kerb to know if it's taken or not (for example: `tim.taken stress`).");
            } else {
                if (msg.channel.type === 'dm' || msg.channel.name.includes('bot')) {
                    const possibleUser = args[1];
                    /// https://www.twilio.com/blog/5-ways-to-make-http-requests-in-node-js-using-async-await
                    try {
                        // TODO: don't rely on a script/endpoint
                        const response = await got(`https://discord2025.scripts.mit.edu/taken.php?name=${possibleUser}&auth=${pepper}`);
                        msg.channel.send(`${response.body}`);
                    } catch (e) {
                        console.error(`${e}`);
                        msg.channel.send(`${e}`);
                    }
                } else {
                    // TODO: Dehardcode this?
                    msg.reply(`Please take kerb checking to <#788807776812924949> or <#783443258789330965>.`);
                }
            }
        }
    }, {
        name: 'listinfo',
        call: async (msg, args) => {
            if (msg.content.trim() === 'tim.listinfo') {
                msg.reply("Please specify a mailing list to see its info (for example: `tim.listinfo plont`).");
            } else {
                const list = args[1];
                try {
                    // TODO: don't rely on a script/endpoint
                    const response = await got(`https://discord2025.scripts.mit.edu/listinfo.php?name=${list}&auth=${pepper}`);
                    msg.channel.send(`${response.body}`);
                } catch (e) {
                    console.error(e);
                    msg.channel.send(`${e}`);
                }
            }
        }
    }, {
        name: 'time',
        call: msg => msg.channel.send(`The time is ${new Date()}`)
    }, {
        name: 'cwd',
        call: msg => msg.channel.send(`The working directory is ${process.cwd()}`)
    }, {
        name: 'fillTheBreakoutRooms',
        call: async (msg, args) => {
            msg.reply('Ok, filling breakout rooms...');
            await breakout.fillBreakoutRooms(client);
        }
    }, {
        name: 'revision',
        call: msg => {
            // TODO: Pull in a git lib or parse .git/HEAD by hand? Summoning ref by hand is dangerous
            exec('git rev-parse HEAD', (error, stdout, stderr) => {
                if (error) {
                    msg.reply(`Error getting revision:\n${stderr}`);
                } else {
                    msg.reply(stdout.substr(0, 7));
                }
            });
        }
    }, {
        name: 'update',
        call: msg => {
            if (Object.keys(config.server_mods).includes(msg.author.id)) {
                /// TODO: do something more ~elegant~
                exec('git pull', async (error, stdout, stderr) => {
                    await msg.reply(`${stdout}\n${stderr}`);
                    await msg.reply('Restarting, please wait a minute...');
                    process.exit();
                });
            } else {
                msg.reply('You do not have permission to run this command.');
            }
        }
    }, {
        name: 'exec',
        call: (msg, args) => {
            if (msg.guild.id !== config.guild_2025) {
                msg.reply('Wrong guild!');
            } else if (Object.keys(config.server_mods).includes(msg.author.id)) {
                const cmd = msg.content.substr(args[0].length + 1).trim();
                exec(cmd, (error, stdout, stderr) => {
                    let output = '';
                    if (stdout.trim() != '') {
                        output += 'Output:\n```\n';
                        output += stdout;
                        output += '\n```\n'
                    }
                    if (stderr.trim() != '') {
                        output += 'Error:\n```\n';
                        output += stderr;
                        output += '\n```';
                    }
                    msg.channel.send(output);
                });
            } else {
                msg.reply('You do not have permission to run this command.');
            }
        }
    }
];
module.exports = { setup };
