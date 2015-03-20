# Squeebot-TwiBot

This is a [node.js](http://nodejs.org/) powered IRC bot originally made by [LunaSquee](https://github.com/LunaSquee) and [djazz](https://github.com/daniel-j).

Modified by [GeekBrony](https://github.com/geekbrony).

### Getting started
1. Clone this repo.
2. Install nodejs, `cd squeebot-twibot`, and then run `npm install`.
3. See the instructions below on how to create the settings file.
4. Run the bot `npm start`.
5. If the above doesn't work: `chmod +x ircbot-squeebot.js` and `./ircbot-squeebot.js`.

### Create the settings file
Make a copy of `example.settings.json` and rename it to `settings.json`. Edit the file as necessary.

**Leave irc password as null if no password.**

### IRC Relay Server
This bot also provides a relay that outputs the messages sent to connected channels. This feature was designed for [MC-Squeebot](https://github.com/LunaSquee/MC-Squeebot) to post irc messages into the Minecraft chat.
To enable the relay you must set `enableRelay` to true in the settings. You can see how to use it in the MC-Squeebot code.
