## NOTE: This repository has not been in active development since May 2015

# Squeebot-TwiBot

This is a [node.js](http://nodejs.org/) powered IRC bot originally made by [LunaSquee](https://github.com/LunaSquee) and [djazz](https://github.com/daniel-j).
Modified by [GeekBrony](https://github.com/geekbrony)

### Getting started
1. Clone this repo
2. Install the dependencies: `npm install`
3. See the instructions below on how to create the settings files
4. Run the bot: `npm start`

### Create the settings files
Make a copy of `example.settings.json` and rename it to `settings.json`. Edit the file as necessary.

If you want to add Twitter features, you must also rename `example.twitter_settings.json` to `twitter_settings.json` and edit the file with your Twitter Developer App keys (to make them, go [here](https://apps.twitter.com/)).

**Leave irc password as null if no password.**

### IRC Relay Server
This bot also provides a relay that outputs the messages sent to connected channels. This feature was designed for [MC-Squeebot](https://github.com/LunaSquee/MC-Squeebot) to post irc messages into the Minecraft chat.
To enable the relay you must set `enableRelay` to true in the settings. You can see how to use it in the MC-Squeebot code.
