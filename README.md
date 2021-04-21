# Another Tim Who's Not Swole

Discord bot for the MIT 2025 server.

The bot will search for a token in the following places:
 - An environment variable, `BOT_TOKEN`
 - A plaintext string in `token.txt`
 - A module export in the file `token.js` (i.e. `module.exports = 'putyourprecioustokenhere';`)
