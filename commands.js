const got = require('got');
const breakout = require('./breakout');

const setup = client => [
    {
        name: 'ping',
        call: msg => {
            msg.channel.send(`Pong, ${msg.author}! The channel is ${msg.channel}.`);
        }
    }, {
        name: 'taken',
        call: async (msg, args) => {
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
    }
];
module.exports = {setup};
