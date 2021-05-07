const got = require('got');
const breakout = require('./breakout');
const { exec } = require("child_process");

const setup = client => [
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
                    let response = null;
                    try {
                        response = JSON.parse(await got(`https://rgabriel.scripts.mit.edu/taken.php?name=${possibleUser}`));
                    } catch (e) {
                        console.error(`${e}`);
                        msg.channel.send(`Got a bad response from the server! Could scripts.mit.edu be down?`);
                        return;
                    }
                    if (response.available) {
                        let message = `:green_check_mark: ${possibleUser} is available!`;
                        if (response.errors.length) {
                            message += ` However, ${response.errors[0].message}. You can still make a mailing list with that name.`;
                        }
                        msg.channel.send(message);
                    } else {
                        let message = ':x: ';
                        if (response.errors.length) {
                            message += response.errors[0].message;
                        } else {
                            message += 'An unknown error occurred.'
                        }
                        msg.channel.send(message);
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
                    const response = await got(`https://rgabriel.scripts.mit.edu/listinfo.php?name=${list}`);
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
    }
];
module.exports = {setup};
