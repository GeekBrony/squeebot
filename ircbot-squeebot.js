#!/usr/bin/env node
'use strict';
// IRC bot by LunaSquee (Originally djazz, best poni :3)

/* TODO
- Command to run on login
*/

// Modules
var net = require('net');
var http = require('http');
var irc = require('irc');
var colors = require('colors');
var util = require('util');
var readline = require('readline');
var youtube = require('youtube-feeds');
var gamedig = require('gamedig');
var events = require("events");
var Twitter = require("twitter")
var emitter = new events.EventEmitter();
var settings = require(__dirname+"/settings.json");


// Config
var SERVER = settings.server;       // The server we want to connect to
var PORT = settings.port || 6667;   // The connection port which is usually 6667
var NICK = settings.username;       // The bot's nickname
var IDENT = settings.password;      // Password of the bot. Set to null to not use password login.
var REALNAME = 'GeekBrony\'s Bot';  // Real name of the bot
var CHANNEL = settings.channel;     // The default channel for the bot
var PREFIX = settings.prefix;       // The prefix of commands
var COMMAND = settings.command;		  // Command to Run on Login
var nickServ = settings.nickserv;
var nickPassword = settings.nickpass;

var TWITTER_ENABLED = settings.twitter_enabled || false;
if(TWITTER_ENABLED){
  var tsettings = require(__dirname+"/twitter_settings.json");
  var TWITTER_CONSUMER_KEY = tsettings.consumer_key || "";
  var TWITTER_CONSUMER_SECRET = tsettings.consumer_secret || "";
  var TWITTER_ACCESS_KEY = tsettings.access_key || "";
  var TWITTER_ACCESS_SECRET = tsettings.access_secret || "";
}
var usersSet = [];
// Episode countdown
var airDate = Date.UTC(2015, 4-1, 4, 16, 0, 0); // Year, month-1, day, hour, minute, second (UTC)
var week = 7*24*60*60*1000;

// Rules for individual channels.
var rules = {"#bronydom":["You can read the rules at http://goo.gl/8822BD"]}

// This is the list of all your commands.
// "command":{"action":YOUR FUNCTION HERE, "description":COMMAND USAGE(IF NOT PRESENT, WONT SHOW UP IN !commands)}
var commands = {
    "commands":{"action":(function(simplified, nick, chan, message, target) {
        listCommands(target, nick)
    }), "description":"- All Commands"},

    "command":{"action":(function(simplified, nick, chan, message, target) {
        if(simplified[1]) {
            var cmdName = (simplified[1].indexOf(PREFIX) === 0 ? simplified[1].substring(1) : simplified[1]);
            if(cmdName in commands) {
                var cmdDesc = commands[cmdName].description;
                if(cmdDesc) {
                    sendPM(target, nick+": \u0002"+PREFIX+cmdName+"\u000f "+cmdDesc);
                } else {
                    sendPM(target, nick+": \u0002"+PREFIX+cmdName+"\u000f - There is no set description for this command.");
                }
            } else {
                sendPM(target, nick+": That is not a known command!");
            }
        } else {
            sendPM(target, nick+": Usage: \u0002"+PREFIX+"command\u000f <command>");
        }
    }), "description":"<command> - Show command description"},

    "infoc":{"action":(function(simplified, nick, chan, message, target) {
        sendPM(target, nick+": Bronydom Network (bronydom.net) Official IRC Chat | Created by GeekBrony | Bot originally made by LunaSquee and djazz");
    }), "description":"- Channel Information"},

    "rules":{"action":(function(simplified, nick, chan, message, target, mentioned, pm) {
        if(pm) {
            sendPM(target, "This command can only be executed in a channel.");
        } else {
            listRulesForChannel(chan);
        }
    }), "description":"- Channel Rules"},

    "np":{"action":(function(simplified, nick, chan, message, target) {
        getCurrentSong(function(d, e, f, i) {
            if(i) {
                sendPM(target, "Now playing: "+d+" | Listeners: "+e+" | Score: "+f+" | Click here to tune in: http://bronydom.net/popup/radio.php")
            } else {
                sendPM(target, d)
            }
        })
    }), "description":"- Currently playing song"},

    "radio":{"action":(function(simplified, nick, chan, message, target) {
        getCurrentSong(function(d, e, f, i) {
            if(i) {
                sendPM(target, "Now playing: "+d+" | Listeners: "+e+" | Score: "+f+" | Click here to tune in: http://bronydom.net/popup/radio.php")
            } else {
                sendPM(target, d)
            }
        })
    }), "description":"- Tune in to Bronydom Radio"},

    "rq":{"action":(function(simplified, nick, chan, message, target) {
        sendPM(target, nick+", go here to request things on the radio: http://req.bronydom.net/ (Doesn't work on live shows)");
    }), "description":"- Request Link"},

    "yay":{"action":(function(simplified, nick, chan, message, target) {
        sendPM(target, nick+": http://flutteryay.com")
    }), "description":"- Fluttershy: Yaaaay"},

    "squee":{"action":(function(simplified, nick, chan, message, target) {
        sendPM(target, nick+": https://www.youtube.com/watch?v=O1adNgZl_3Q")
    }), "description":"- Fluttershy: Squee"},

    "hug":{"action":(function(simplified, nick, chan, message, target) {
        bot.action(target, "hugs "+nick);
    }), "description":"Hugs for everyone :)"},

    "ping":{"action":(function(simplified, nick, chan, message, target) {
        sendPM(nick, "pong");
    }), "description":"Ping -> Pong"},

    "moon":{"action":(function(simplified, nick, chan, message, target) {
        //bot.kick(chan, nick, "TO THE MOOOOON!");
        bot.send("kick", chan, nick, "TO THE MOOOOON!")
    }), "description":"Do you like bananas?"},

    "viewers":{"action":(function(simplified, nick, chan, message, target) {
        livestreamViewerCount((function(r) {
            sendPM(target, r+" | Livestream: http://bronydom.net/livestream")
        }))
    }),"description":"- Number of people watching Bronydom Network's livestream"},

    "nextep":{"action":(function(simplified, nick, chan, message, target) {
        var counter = 0;
        var now = Date.now();
        do {
            var timeLeft = Math.max(((airDate+week*(counter++)) - now)/1000, 0);
        } while (timeLeft === 0 && counter < 26);
        if (counter === 26) {
            sendPM(target, "Season 5 is over :(");
        } else {
            sendPM(target, "Next Season 5 episode airs in %s", readableTime(timeLeft, true));
        }
    }),"description":"- Time left until next pone episode."},

    "episodes":{"action":(function(simplified, nick, chan, message, target) {
        sendPM(target, nick+": List of all MLP:FiM Episodes: http://mlp-episodes.tk/");
    }),"description":"- List of pony episodes"},

    "minecraft":{"action":(function(simplified, nick, chan, message, target) {
        var reqplayers = false;

        if(simplified[1] === "players") {
            reqplayers = true;
        }

        getGameInfo("minecraft", "play.bronydom.net", function(err, msg) {
            if(err) {
                sendPM(target, err);
                return;
            }
            sendPM(target, msg);
        }, reqplayers);
    }),"description":"[players] - Information about our Minecraft Server"},

    "mc":{"action":(function(simplified, nick, chan, message, target) {
        var reqplayers = false;

        if(simplified[1] === "players") {
            reqplayers = true;
        }

        getGameInfo("minecraft", "play.bronydom.net", function(err, msg) {
            if(err) {
                sendPM(target, err);
                return;
            }
            sendPM(target, msg);
        }, reqplayers);
    })},

    "episode":{"action":(function(simplified, nick, chan, message, target) {
        var param = simplified[1];
        if(param != null) {
            var epis = param.match(/^s([0-9]+)e([0-9]+)$/i);
            if(epis){
                var link = "http://mlp-episodes.tk/#epi"+epis[2]+"s"+epis[1];
                sendPM(target, nick+": Watch the episode you requested here: "+link);
            } else {
                sendPM(target, irc.colors.wrap("dark_red",nick+": Correct usage !ep s[season number]e[episode number]"));
            }
        } else {
            sendPM(target, irc.colors.wrap("dark_red",nick+": Please provide me with episode number and season, for example: !ep s4e4"));
        }
    }),"description":"s<Season> e<Episode Number> - Open a pony episode"},

    "statusof":{"action":(function(simplified, nick, chan, message, target) {
        var array = message.split(" ");
        var param = array[1];
        if(param != null) {
        	if(usersSet != []){
            	if(usersSet[param] != null) {
            		sendPM(nick, param + "'s status:"+irc.colors.wrap("bold",usersSet[param]));
            	} else {
            		sendPM(nick, param + " has not set a status.");
            	}
            } else {
            	sendPM(nick, param + " has not set a status.");
            }
        } else {
            sendPM(nick, irc.colors.wrap("dark_red","Error: Please provide a user. Example: \""+PREFIX+"statusof <user>\""));
        }
    }),"description":"Check the status of a user."},

    "showtweet":{"action":(function(simplified, nick, chan, message, target) {

        var param = simplified[1];
        if(TWITTER_ENABLED) {
          //sendPM(target, param);
          getTweet(param, target);
        } else {
          sendPM(target, nick + ": Twitter features not enabled.");
        }

    }),"description":"Show the contents of a tweet's ID."},

    "setstatus":{"action":(function(simplified, nick, chan, message, target) {
        var array = message.split(" ");
        var previousStatus;
        var param = array[1];
        if(param != null) {
        delete array[0];
        param = array.join(" ");
        	if(array[1] === "-r") {
        		if(!usersSet.hasOwnProperty(nick)) {
        			sendPM(nick, "You need to have a status to remove it, so nothing was removed. :P");
        		} else {
        			previousStatus = usersSet[nick];
        			delete usersSet[nick];
        			sendPM(nick, "Your status, \""+irc.colors.wrap("bold",previousStatus)+"\", has been deleted from the status database.");
        		}
        	} else {
        		var lengthOfParam = param.length;
        		if(lengthOfParam > 120) {
        			sendPM(nick, "Status has been shortened from "+lengthOfParam+" characters to 120 characters.");
        		}
				usersSet[nick] = param.substring(0, 121);
				sendPM(nick, "Status added as:"+irc.colors.wrap("bold",usersSet[nick]));
				sendPM(chan, nick + "'s new status:"+irc.colors.wrap("bold",usersSet[nick]));
			}
        } else {
            sendPM(nick, irc.colors.wrap("dark_red","Error: Please provide a status. Example: \""+PREFIX+"setstatus <message>\" or to remove, type \""+PREFIX+"setstatus -r\""));
        }
    }),"description":"Set a status message."},

    "t":{"action":(function(simplified, nick, chan, message, target) {
        var param = simplified[1];
        if(param != null) {
        	/* BOOKS */
            if(param.toUpperCase() === "BOOKS") {
            	var roll = randomize(1,4);
    			var messageToSend = "Error. Roll # is: "+roll;
    			switch(roll) {
    				case 1:
            			messageToSend = "OH, that reminds me! I need to read that new Daring Do book!";
            			break;
        			case 2:
        				if(simplified[2] != null) {
            				messageToSend = "I must continue my studies about "+simplified[2]+"!";
            			} else {
            				messageToSend = "Books?! Where?";
            			}
            			break;
        			case 3:
            			messageToSend = "[BOOKS INTENSIFY]";
            			break;
        			case 4:
           				if(simplified[2] != null) {
            				messageToSend = "Now, where's that book about "+simplified[2]+"?";
            			} else {
            				messageToSend = "SPIKE! Get that book!";
            			}
            			break;
    			}
        		sendPM(target, messageToSend);
            } else if(param.toUpperCase() === "PONY") {
            	sendPM(target, "One does not simply name best pony without mentioning Twilight as the best!");
            } else if(param.toUpperCase() === "BRONIES" || param.toUpperCase() === "BRONY") {
            	sendPM(target, "I hereby declare all of the bronies to bow down to me, THE ABSOLUTE BESTEST PONY OF ALL!");
            } else if(param.toUpperCase() === "SPIKE") {
            	sendPM(target, "My #1 Assistant! :D");
            } else if(param.toUpperCase() === "PINKIE" && simplified[2].toUpperCase() === "PIE") {
            	sendPM(target, "Where's Pinkie? Did she break the fourth wall again?");
            } else if(param.toUpperCase() === "TWILIGHT" && simplified[2].toUpperCase() === "SPARKLE") {
            	sendPM(target, "Uuhh, why would I talk about me??");
            } else if(param.toUpperCase() === "THE" && simplified[2].toUpperCase() === "DRESS") {
            	sendPM(target, "Obviously, it's Blue and Black...or is it White and Gold?");
            	bot.action(target, "starts sweating uncontrollably")
            } else if(param.toUpperCase() === "MARKIPLIER") {
            	sendPM(target, "Apparently, all I see now is Markiplier on YouTube, and then some random FNAF video afterwards.");
            } else if(param.toUpperCase() === "PEWDIEPIE") {
              sendPM(target, "The last time I watched PewDiePie was when I was browsing through the top charts. His scream scared me and I probably will never return.");
            } else if(param.toUpperCase() === "BRONYDOM" && simplified[2].toUpperCase() === "NETWORK") {
              sendPM(target, "The network I belong to! :D");
            } else if(param.toUpperCase() === "GEEKBRONY") {
              sendPM(target, "Uhm, about GeekBrony? He's cool. He developed me! :D");
            } else if(param.toUpperCase() === "LIFE") {
              sendPM(target, "Life? Do I have a life? Good question.");
            } else if(param.toUpperCase() === "CLOTHES") {
              sendPM(target, "Haha, funny. I don't think a javascript program can wear some clothes.");
            } else if(param.toUpperCase() === "JOKE" || param.toUpperCase() === "HUMOR") {
              sendPM(target, "How do I joke? I'm a program. I don't think programs with actual humor have been invented yet.");
            } else if(param.toUpperCase() === "MARRY" && simplified[2].toUpperCase() === "ME") {
              sendPM(target, "*sighs* Am I an actual real object?");
            } else if(param.toUpperCase() === "FUN") {
              sendPM(target, "We need Pinkie Pie over here! D:");
            } else if(param.toUpperCase() === "SOMETHING" && !(simplified.hasOwnProperty(2))) {
              sendPM(target, "Haha, very clever. Try something else.");
            } else if(param.toUpperCase() === "SOMETHING" && simplified[2].toUpperCase() === "ELSE") {
              sendPM(target, "Very funny.");
            } else if(param.toUpperCase() === "SOCKS" || param.toUpperCase() === "SEXY") {
              bot.action(target, "puts on socks and scrunches");
            } else if(param.toUpperCase() === "RADIO") {
              bot.action(target, "silently headbangs for no reason");
            } else if(param.toUpperCase() === "ILLUMINATI") {
              var illuminatiChat = [];
              bot.action(target, "gasps");
              illuminatiChat.push("Half-Life 3 was the illuminati's plan!");
              illuminatiChat.push("There are exactly THREE sides to a triangle.");
              illuminatiChat.push("Half-Life 1 totally has next-gen MLG graphics.");
              illuminatiChat.push("Illuminati is a triangle. Illuminati has one eye.");
              illuminatiChat.push("ILLUMINATI CONFIRMED!");
              sendWithDelay(illuminatiChat, target, 1500);
            } else if(param.toUpperCase() === "CLOP") {
              bot.action(target, "clops hooves together repeatedly");
            } else if(param.toUpperCase() === "NO") {
              sendPM(target, "nopony says no to me! D:");
            } else if(param.toUpperCase() === "YES") {
              sendPM(target, ";)");
            } else {
            	sendPM(target, "I do not know what "+param+" is, unfortunately! I MUST STUDY ABOUT "+param.toUpperCase()+"!");
            }
        } else {
            sendPM(target, irc.colors.wrap("dark_red",nick+": Please provide me with a topic to talk about!"));
        }
    }),"description":"- Provide something for me to talk about, and I will."}
};

/*
    ===================
    NICKNAME UTILITIES!
    ===================
*/
var nicks = {};
var iconvert = {};

function INicksGetMode(nickname, onChannel) {
    var channel = onChannel.toLowerCase();
    if(channel in nicks) {
        if(nickname in nicks[channel]) {
            return nicks[channel][nickname];
        }
    }
}

function IChannelNames(onChannel, namesObj) {
    var channel = onChannel.toLowerCase();
    var initial = {}
    for(var key in namesObj) {
        var prefix = iconvert.prefixToMode(namesObj[key]);
        initial[key] = prefix;
    }
    nicks[channel] = initial;
}

function IHandleJoin(nickname, onChannel) {
    var channel = onChannel.toLowerCase();
    if(channel in nicks) {
        nicks[channel][nickname] = "";
    }
}

function IHandlePart(nickname, onChannel) {
    var channel = onChannel.toLowerCase();
    if(channel in nicks) {
        if(nickname in nicks[channel]) {
            delete nicks[channel][nickname];
        }
    }
}

function IHandleQuit(nickname) {
    for(var key in nicks) {
        var obj = nicks[key];
        if(nickname in obj) {
            delete nicks[key][nickname];
        }
    }
}

function IHandleModeAdded(nickname, mode, onChannel) {
    if(mode!="q" && mode!="a" && mode!="o" && mode!="h" && mode!="v") return;
    var channel = onChannel.toLowerCase();
    if(channel in nicks) {
        var chan = nicks[channel];
        if(nickname in chan) {
            var oldmode = chan[nickname];
            if(oldmode == "q" && mode == "o") return;
            if(oldmode == "a" && mode == "o") return;
            nicks[channel][nickname] = mode;
        }
    }
}

function IHandleModeRemoved(nickname, mode, onChannel) {
    if(mode!="q" && mode!="a" && mode!="o" && mode!="h" && mode!="v") return;
    var channel = onChannel.toLowerCase();
    if(channel in nicks) {
        var chan = nicks[channel];
        if(nickname in chan) {
            nicks[channel][nickname] = "";
        }
    }
}

function IHandleNickChange(oldNick, newNick) {
    emitter.emit('newIrcMessage', oldNick, "", " is now known as "+newNick, "NICK");
    for(var key in nicks) {
        var obj = nicks[key];
        if(oldNick in obj) {
            var backupMode = obj[oldNick];
            delete nicks[key][oldNick];
            nicks[key][newNick] = backupMode;
        }
    }
}

function ILeftAChannel(channel) {
    if(channel.toLowerCase() in nicks) {
        delete nicks[channel.toLowerCase()];
    }
}

iconvert.isChannelOP = (function(username, channel) {
    if(channel in nicks) {
        var chanobj = nicks[channel];
        if(username in chanobj) {
            if(chanobj[username] === "q" || chanobj[username] === "a" || chanobj[username] === "o") {
                return true;
            }
            return false;
        }
    }
});

iconvert.prefixToMode = (function(prefix) {
    var mode = "";
    switch (prefix) {
        case "~":
            mode = "q";
            break;
        case "&":
            mode = "a";
            break;
        case "@":
            mode = "o";
            break;
        case "%":
            mode = "h";
            break;
        case "+":
            mode = "v";
            break;
        default:
            mode = "";
            break;
    }
    return mode;
});

iconvert.modeToPrefix = (function(mode) {
    var prefix = "";
    switch (mode) {
        case "q":
            prefix = "~";
            break;
        case "a":
            prefix = "&";
            break;
        case "o":
            prefix = "@";
            break;
        case "h":
            prefix = "%";
            break;
        case "v":
            prefix = "+";
            break;
        default:
            prefix = "";
            break;
    }
    return prefix;
});

iconvert.modeToText = (function(mode) {
    var prefix = "";
    switch (mode) {
        case "q":
            prefix = "Owner";
            break;
        case "a":
            prefix = "Admin";
            break;
        case "o":
            prefix = "Op";
            break;
        case "h":
            prefix = "Halfop";
            break;
        case "v":
            prefix = "Voice";
            break;
        default:
            prefix = "Normal";
            break;
    }
    return prefix;
});
/*
    End of nick utils.
*/

// List all commands that have a description set
function listCommands(target, nick) {
    var comms = [];
    var listofem = [];
    var variab = false;
    comms.push("*** "+NICK.toUpperCase()+" COMMANDS ***");
    comms.push("All "+NICK+" commands start with a "+PREFIX+" prefix.");
    comms.push("Type  "+PREFIX+"command <command> for more information on that command.");
    for(var command in commands) {
        var obj = commands[command];
        if("description" in obj) {
            variab = !variab;
            listofem.push("\u0002"+irc.colors.wrap((variab?"dark_green":"light_green"), PREFIX+command));
        }
    }
    comms.push(listofem.join(", "));
    comms.push("***** End of "+PREFIX+"commands *****");
    sendWithDelay(comms, nick, 1000);
}

function sendWithDelay(messages, target, time) {
    var timeout = time || 1000;
    var c = 0;
    function sendMessageDelayed() {
        sendPM(target, messages[c]);
        c++;
        if(messages[c] != null)
            setTimeout(sendMessageDelayed, timeout);
    }
    sendMessageDelayed()
}

// Send a list of rules to a channel.
function listRulesForChannel(onChannel) {
    var channel = onChannel.toLowerCase();
    if(channel in rules) {
        sendPM(channel, "Channel Rules of "+onChannel+": ");
        var rls = rules[channel];
        rls.forEach(function(e) {
            sendPM(channel, e);
        });
    }
}

// Grab JSON from an url
function JSONGrabber(url, callback) {
    http.get(url, function(res){
        var data = '';

        res.on('data', function (chunk){
            data += chunk;
        });

        res.on('end',function(){
            var obj = JSON.parse(data);
            callback(true, obj);
        })

    }).on('error', function(e) {
        callback(false, e.message);
    });
}

// Experimental Function!
function formatmesg(message) {
    var pass1 = message.match(/#c/g) ? message.replace(/#c/g, '\u0003').replace(/#f/g, "\u000f") + '\u000f' : message;
    var pass2 = pass1.match(/#b/g) ? pass1.replace(/#b/g, '\u0002') : pass1;
    var pass3 = pass2.match(/#u/g) ? pass2.replace(/#u/g, '\u001F') : pass2;
    return pass3.match(/#i/g) ? pass3.replace(/#i/g, '\u0014') : pass3;
}

// Get current Bronydom Radio song
function getCurrentSong(callback) {
    JSONGrabber("http://www.bronydom.net/api/stats/", function(success, content) {
        if(success) {
            if(content.radio.song_info.text != null) {
                var theTitle = new Buffer(content.radio.song_info.text, "utf8").toString("utf8");
                var splitUp = theTitle.replace(/\&amp;/g, "&").split(" - ");
                if(splitUp.length===2) {
                    theTitle=irc.colors.wrap("bold",splitUp[1])+(splitUp[0]?" by "+irc.colors.wrap("bold",splitUp[0]):"");
                }
                callback(theTitle, irc.colors.wrap("bold",content.radio.listeners.all_streams), irc.colors.wrap("bold",content.radio.song_info.score), true);
            } else {
                callback("Bronydom Radio is offline (for some reason)!", "", false);
            }
        } else {
            callback("Bronydom Radio is offline (for some reason)!", "", false);
        }
    });
}

function getTweet(tweetID, target) {
  tw.get('statuses/show/', {id: tweetID}, function(error, tweet, response){
    if(error) sendPM(target, "Error: " + error);
    sendPM(target, irc.colors.wrap("bold","@"+tweet.user.screen_name)+": "+tweet.text.replace("\n", " "));
    //console.log(Object.keys(tweet.user.screen_name)); //Development Test
  });
}

// Gameserver info (This function makes me puke)
function getGameInfo(game, host, callback, additional) {
    Gamedig.query(
    {
        type: game,
        host: host
    },
        function(state) {
            if(state.error) callback("Server is offline!", null);
            else {
                switch(game) {
                    case "tf2":
                        if(additional) {
                            callback(null, "[!Team Fortress 2] " + (typeof(additional) === "object" ? state[additional[0]][additional[1]] : state[additional]));
                        } else {
                            callback(null, "[Team Fortress 2] IP: "+host+" MOTD: \""+state.name+"\" Players: "+state.raw.numplayers+"/"+state.maxplayers);
                        }
                        break;
                    case "minecraft":
                        if(additional!=null && additional === true) {
                            if(state.players.length > 0) {
                                var players = [];
                                state.players.forEach(function(t) {
                                    players.push(t.name);
                                });
                                callback(null, "[Minecraft] Players: "+players.join(", "));
                            } else {
                                callback(null, "[Minecraft] No players");
                            }
                        } else {
                            callback(null, "[Minecraft] IP: "+host+" MOTD: \""+state.name+"\" Players: "+state.raw.numplayers+"/"+state.raw.maxplayers);
                        }
                        break;
                    case "mumble":
                        if(additional!=null && additional === true) {
                            if(state.players.length > 0) {
                                var players = [];
                                // Sort, show most active first
                                state.players.sort(function (u1, u2) {
                                    return u1.idlesecs - u2.idlesecs;
                                });
                                state.players.forEach(function(t) {
                                    var isMuted = t.mute || t.selfMute;
                                    var isDeaf = t.deaf || t.selfDeaf;
                                    var o = t.name;
                                    if (isMuted && isDeaf) {
                                        o = irc.colors.wrap("dark_red", o);
                                    } else if (isMuted) {
                                        o = irc.colors.wrap("orange", o);
                                    } else if (isDeaf) {
                                        o = irc.colors.wrap("light_blue", o);
                                    } else {
                                        o = irc.colors.wrap("light_green", o);
                                    }
                                    players.push(o);
                                });
                                callback(null, "[Mumble] Users: "+players.join(", "));
                            } else {
                                callback(null, "[Mumble] No users ");
                            }
                        } else {
                            callback(null, "[Mumble server] IP: "+host+" Users online: "+state.players.length);
                        }
                        break;
                };
            }
        }
    );
}

// Dailymotion video puller
function dailymotion(id, callback) {
    JSONGrabber("https://api.dailymotion.com/video/"+id+"?fields=id,title,owner,owner.screenname", function(success, content) {
        if(success) {
            callback(content);
        }
    });
}

// Livestream viewers
function livestreamViewerCount(callback) {
    JSONGrabber("http://www.bronydom.net/status/livestream.php", function(success, content) {
        if(success) {
            var view = content.viewers;
            if(view!=-1) {
                callback("Viewers: "+view);
            } else {
                callback("The livestream is offline.");
            }
        } else {
            callback("The livestream is offline.");
        }
    });
}

// Finds urls in string
function findUrls(text) {
    var source = (text || '').toString();
    var urlArray = [];
    var url;
    var matchArray;
    var regexToken = /(((ftp|https?):\/\/)[\-\w@:%_\+.~#?,&\/\/=]+)|((mailto:)?[_.\w-]+@([\w][\w\-]+\.)+[a-zA-Z]{2,3})/g;

    while((matchArray = regexToken.exec(source))!== null) {
        var token = matchArray[0];
        if(token.indexOf("youtube.com/watch?v=") !== -1) {
            urlArray.push(token);
        } else if(token.indexOf("youtu.be/") !== -1) {
            urlArray.push(token);
        } else if(token.indexOf("dailymotion.com/video/") !== -1) {
            urlArray.push(token);
        } else if(token.indexOf("twitter.com/") !== -1 && token.indexOf("/status/") !== -1) {
              urlArray.push(token);
        }
    }
    return urlArray;
}

// Handles messages
function handleMessage(nick, chan, message, simplified, isMentioned, isPM) {
    var target = isPM ? nick : chan;
    if(simplified[0].indexOf(PREFIX) === 0 && simplified[0].toLowerCase().substring(1) in commands) {
        var command = commands[simplified[0].toLowerCase().substring(1)];
        if("action" in command)
            command.action(simplified, nick, chan, message, target, isMentioned, isPM);
    }else if(simplified[1] != null && simplified[1].toUpperCase() === "TIME") {
        sendPM(target, simplified[0].toUpperCase()+" TIME!!! :D")
    }else if(findUrls(message).length > 0) {
        var link = findUrls(message)[0];
        if(link.indexOf("youtu.be") !== -1) {
        var det = link.substring(link.indexOf('.be/')+4);
            if(det) {
                youtube.video(det).details(function(ne, tw) { if( ne instanceof Error ) { mylog("Error in getting youtube url!") } else { sendPM(target, "YouTube video \""+tw.title+"\" Uploaded by \""+tw.uploader+"\" Views: "+tw.viewCount);}});
            }
        } else if(link.indexOf("youtube.com") !== -1) {
        var det = link.match("[\\?&]v=([^&#]*)")[1];
            if(det) {
            youtube.video(det).details(function(ne, tw) { if( ne instanceof Error ) { mylog("Error in getting youtube url!") } else { sendPM(target, "YouTube video \""+tw.title+"\" Uploaded by \""+tw.uploader+"\" Views: "+tw.viewCount);}});
            }
        } else if(link.indexOf("dailymotion.com/video/") !== -1) {
            var det = link.match("/video/([^&#]*)")[1];
            if(det) {
                dailymotion(det, (function(data) {
                    sendPM(target, "Dailymotion video \""+data.title+"\" Uploaded by \""+data["owner.screenname"]+"\"");
                }))
            }
        } else if(link.indexOf("twitter.com/") !== -1) {
          if(TWITTER_ENABLED) {
            var det = link.match("/status/([^&#]*)")[1];
            if(det) {
                getTweet(det, target);
            }
          } else {
            //sendPM(target, nick + ": Twitter features not enabled.");
          }
        }
    }
    else if(isMentioned) {
    	var roll = randomize(1,9);
    	var messageToSend = "For some reason, an error happened. :O For reference, Roll # is: "+roll;
    	switch(roll) {
    		  case 1:
            	messageToSend = "Oh, hey "+nick+"!";
            	break;
        	case 2:
            	messageToSend = "Hello, "+nick+"!";
            	break;
        	case 3:
            	messageToSend = "What do you want, "+nick+"?";;
            	break;
        	case 4:
            	messageToSend = "Who, me?";
            	break;
        	case 5:
            	messageToSend = "How are you, "+nick+"?";
            	break;
        	case 6:
            	messageToSend = "* hugs "+nick+" *";
            	break;
        	case 7:
            	messageToSend = "* looks up at "+nick+" *";
            	break;
        	case 8:
            	messageToSend = "* studies "+nick+" *";
            	break;
        	case 9:
            	messageToSend = "* yells at "+nick+" *";
            	break;
    	}
        sendPM(target, messageToSend);
    }
}

// Relays irc messages to clients

function ircRelayMessageHandle(c) {
    emitter.once('newIrcMessage', function (from, to, message, type) {
        if (c.writable) {
            c.write(type+">"+from+':'+to+':'+message+'\r\n');
            ircRelayMessageHandle(c);
        }
    });
}

function ircRelayServer() {
    if (!settings.enableRelay) return;

    var server = net.createServer(function (c) { //'connection' listener
        var pingWait = null, pingTimeout = null;

        function ping() {
            clearTimeout(pingWait);
            pingWait = setTimeout(function () {
                c.write('ping');
                //info('RELAY: Send ping');
                pingTimeout = setTimeout(function () {
                    c.destroy();
                    info('RELAY: Connection timed out');
                }, 15*1000);
            }, 15*1000);
        }
        function pong() {
            //info('RELAY: Got pong');
            clearTimeout(pingTimeout);
            ping();
        }

        var firstData = true;
        info('RELAY: Client %s is connecting...', c.remoteAddress);
        c.setEncoding('utf8');
        c.once('end', function() {
            clearTimeout(timeout);
            info('RELAY: Client disconnected');
        });
        c.once('error', function (err) {
            clearTimeout(timeout);
            info('RELAY: Client error: '+err);
            c.destroy();
        });
        c.once('close', function() {
            clearTimeout(timeout);
            clearTimeout(pingWait);
            clearTimeout(pingTimeout);
            info('RELAY: Client socket closed');
        });
        c.on('data', function (data) {
            if (firstData) {
                firstData = false;
                data = data.trim();
                clearTimeout(timeout);

                if (data === settings.relayPassword) {
                    info('RELAY: Client logged in');
                    c.write('Password accepted');
                    ircRelayMessageHandle(c);
                    ping();
                } else {
                    info('RELAY: Client supplied wrong password: %s', data);
                    c.end("Wrong password");
                }
            } else {
                if (data === 'pong') {
                    pong();
                }
            }
        });
        var timeout = setTimeout(function () {
            c.end("You were too slow :I");
            info('RELAY: Client was too slow (timeout during handshake)');
        }, 10*1000);

    });
    server.listen(settings.relayPort, function () {
        info('RELAY: Relay server listening on port %d', settings.relayPort);
    });
}

//*******************************************************************************************************
// This is where the magic happens
//*******************************************************************************************************

var bot = new irc.Client(SERVER, NICK, {
    channels: [CHANNEL],
    password: IDENT,
    realName: REALNAME,
    port: PORT,
    //secure: true,
    //certExpired: true,
    stripColors: true
});
var lasttopic = "";
var lasttopicnick = "";

// Load Twitter Module
var tw = new Twitter({
  consumer_key: TWITTER_CONSUMER_KEY,
  consumer_secret: TWITTER_CONSUMER_SECRET,
  access_token_key: TWITTER_ACCESS_KEY,
  access_token_secret: TWITTER_ACCESS_SECRET
});

bot.on('error', function (message) {
    info('ERROR: %s: %s', message.command, message.args.join(' '));
});
bot.on('topic', function (channel, topic, nick) {
    lasttopic = topic;
    lasttopicnick = nick;
    logTopic(channel, topic, nick);
});
bot.on('message', function (from, to, message) {
    var simplified = message.replace(/\:/g, ' ').replace(/\,/g, ' ').replace(/\./g, ' ').replace(/\?/g, ' ').trim().split(' ');
    var isMentioned = simplified.indexOf(NICK) !== -1;
    logChat(from, to, message, isMentioned);
    handleMessage(from, to, message, simplified, isMentioned, false);
});
bot.on('join', function (channel, nick) {
    if (nick === NICK) {
        mylog((" --> ".green.bold)+"You joined channel "+channel.bold);
        rl.setPrompt(util.format("> ".bold.magenta), 2);
        if(nickServ == true) {
			      sendPM("NickServ", "identify "+nickPassword);
			      mylog((" --> ".green.bold)+"Identified! "+channel.bold);
		    }
        if(COMMAND != null) {
          //var cA = COMMAND.split(" ");
          //bot.send(cA[0]);
        }
        var randomInt = randomize(0,4);
        if(randomInt === 0) sendPM(channel, "I'm baack!");
        if(randomInt === 1) sendPM(channel, "Woah, where was I?");
        if(randomInt === 2) sendPM(channel, "*sigh* It's great to be back!");
        if(randomInt === 3) sendPM(channel, "I hope nobody thought I would be away forever!");
        if(randomInt === 4) sendPM(channel, "I'm alive? I am! Heheh..");
    } else {
        mylog((" --> ".green.bold)+'%s has joined %s', nick.bold, channel.bold);
        emitter.emit('newIrcMessage', nick, channel, " has joined ", "JOIN");
        if(nick.toUpperCase() === "GEEKBRONY") {
        	sendPM(channel, nick+", my developer, is back! :D");
        } else {
        	sendPM(channel, "Hello, "+nick+"!");
        }
        IHandleJoin(nick, channel);
    }
});
bot.on('kick', function (channel, nick, by, reason, message) {
    if (nick === NICK) {
        mylog((" <-- ".red.bold)+"You was kicked from %s by %s: %s", channel.bold, message.nick, reason);
        info("Rejoining "+channel.bold+" in 5 seconds...");
        ILeftAChannel(channel);
        setTimeout(function () {
            bot.join(channel);
        }, 5*1000);
    } else {
        mylog((" <-- ".red.bold)+nick+" was kicked from %s by %s: %s", channel.bold, message.nick, reason);
        emitter.emit('newIrcMessage', nick, channel, " was kicked by "+message.nick+" ("+reason+")", "KICK");
        IHandlePart(nick, channel);
    }
})
bot.on('part', function (channel, nick, reason) {
    if (nick !== NICK) {
        mylog((" <-- ".red.bold)+'%s has left %s', nick.bold, channel.bold);
        emitter.emit('newIrcMessage', nick, channel, " has left ", "PART");
        sendPM(channel, "Bye, "+nick+"!");
        IHandlePart(nick, channel);
    } else {
        mylog((" <-- ".red.bold)+'You have left %s', channel.bold);
        ILeftAChannel(channel);
    }
});
bot.on('quit', function (nick, reason, channels) {
    mylog((" <-- ".red.bold)+'%s has quit (%s)', nick.bold, reason);
    emitter.emit('newIrcMessage', nick, "", " has quit ("+reason+")", "QUIT");
    //sendPM(channel, "Bye, "+nick+"!");
    IHandleQuit(nick);
});
bot.on('names', function(channel, nicks) {
    IChannelNames(channel, nicks);
});
bot.on('pm', function (nick, message) {
    logPM(nick, message);
    var simplified = message.replace(/\:/g, ' ').replace(/\,/g, ' ').replace(/\./g, ' ').replace(/\?/g, ' ').trim().split(' ');
    var isMentioned = simplified.indexOf(NICK) !== -1;
    handleMessage(nick, "", message, simplified, isMentioned, true);
});
bot.on('notice', function (nick, to, text) {
    //mylog(nick, to, text);
});
bot.on('raw', function (message) {
    if (message.command === 'PRIVMSG' && message.args[1] && message.args[1].indexOf("\u0001ACTION ") === 0) {
        var action = message.args[1].substr(8);
        action = action.substring(0, action.length-1);
        emitter.emit('newIrcMessage', message.nick, message.args[0], action, "ACTION");
        mylog("* %s".bold+" %s", message.nick, action);
    }
});
bot.on('+mode', function(channel, by, mode, argument, message) {
    IHandleModeAdded(argument, mode, channel);
});
bot.on('-mode', function(channel, by, mode, argument, message) {
    IHandleModeRemoved(argument, mode, channel);
});
bot.on('nick', IHandleNickChange);

var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});
rl.setPrompt("");

rl.on('line', function (line) {

    if (line === '') {
        return;
    }
    if (line.indexOf('/quit') === 0) {
        var msg = line.substring(6) || "I'll be back later. I'm restarting.";
        info("Quitting...");
        rl.setPrompt("");
        bot.disconnect(msg, function () {
            process.exit(0);
        });
        return;
    } else if (line.indexOf('/msg ') === 0) {
        var split = line.split(" ");
        var nick = split[1];
        var msg = split.slice(2).join(" ");
        sendPM(nick, msg);
    } else if (line.indexOf('/join ') === 0) {
        var chan = line.substr(6);
        bot.join(chan);
    } else if (line.indexOf('/part ') === 0) {
        var chan = line.substr(6);
        bot.part(chan, NICK+" I'll be back.");
    } else if (line.indexOf('/me ') === 0) {
        var msg = line.substr(4);
        bot.action(CHANNEL, msg);
    } else if (line === '/topic') {
        logTopic(CHANNEL, lasttopic, lasttopicnick);
    } else if (line.indexOf("/") === 0) {
        info(("Unknown command: "+line.substr(1).bold).red);
    } else {
        sendChat(formatmesg(line));
    }
    rl.prompt(true);
});

info('Connecting...');
ircRelayServer();
function mylog() {
    // rl.pause();
    rl.output.write('\x1b[2K\r');
    console.log.apply(console, Array.prototype.slice.call(arguments));
    // rl.resume();
    rl._refreshLine();
}

function info() {
    arguments[0] = "  -- ".magenta+arguments[0];
    mylog(util.format.apply(null, arguments));
}

function sendChat() {
    var message = util.format.apply(null, arguments);
    logChat(NICK, CHANNEL, message);
    bot.say(CHANNEL, message);
}
function sendPM(target) {
    if (target === CHANNEL) {
        sendChat.apply(null, Array.prototype.slice.call(arguments, 1));
        return;
    }
    var message = util.format.apply(null, Array.prototype.slice.call(arguments, 1));
    logPM(NICK+" -> "+target, message);
    bot.say(target, message);
}
function logChat(nick, chan, message, isMentioned) {
    if (isMentioned) {
        nick = nick.yellow;
    }
    mylog('[%s] %s: %s', chan, nick.bold, message);
    emitter.emit('newIrcMessage', nick, chan, message, "PRIVMSG");
}
function logPM(target, message) {
    mylog('%s: %s', target.bold.blue, message);
}
function logTopic(channel, topic, nick) {
    info('Topic for %s is "%s", set by %s', channel.bold, topic.yellow, nick.bold.cyan);
}
function zf(v) {
    if (v > 9) {
        return ""+v;
    } else {
        return "0"+v;
    }
}
function readableTime(timems, ignoreMs) {
    var time = timems|0;
    var ms = ignoreMs?'':"."+zf((timems*100)%100|0);
    if (time < 60) return zf(time)+ms+"s";
    else if (time < 3600) return zf(time / 60|0)+"m "+zf(time % 60)+ms+"s";
    else if (time < 86400) return zf(time / 3600|0)+"h "+zf((time % 3600)/60|0)+"m "+zf((time % 3600)%60)+ms+"s";
    else return (time / 86400|0)+"d "+zf((time % 86400)/3600|0)+"h "+zf((time % 3600)/60|0)+"m "+zf((time % 3600)%60)+"s";
}
function randomize(bottom, top) {
    return Math.floor( Math.random() * ( 1 + top - bottom ) ) + bottom;
}
