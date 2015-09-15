var app = require('express')();
require('dotenv').load();
var express = require('express')
var sp = require('libspotify');
var lame = require('lame');
var querystring = require('querystring');
var cookieParser = require('cookie-parser');
var cred = require('./spotify_key/passwd');
var BinaryServer = require('binaryjs').BinaryServer;
var server = BinaryServer({
    port: 9000
});
var request = require('request');
//var Speaker = require('speaker');
var session = new sp.Session({
    applicationKey: __dirname + '/./spotify_key/spotify_appkey.key'
});

var encoder = new lame.Encoder({
    channels: 2,
    bitDepth: 16,
    sampleRate: 44100,
    bitRate: 128,
    outSampleRate: 22050,
    mode: lame.STEREO
});

var cookieSession = require('cookie-session')

var generateRandomString = function(length) {
    var text = '';
    var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (var i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
};

app.use(cookieSession({
    secret: generateRandomString(20),
    domain: 'emraldia.com'
}));

app.use(cookieParser());

var client_id = process.env.CLIENT_ID;
var client_secret = process.env.CLIENT_SECRET;
var redirect_uri = 'http://emraldia.com:8000/callback';

var queue = []

app.use(express.static('public'));



global.player = session.getPlayer();
//global.speaker = new Speaker();
session.login(cred.login, cred.password);
session.once('login', function(err) {
    if (err) this.emit('error', err);
    console.log("logged in as " + cred.login)
});
var stateKey = 'spotify_auth_state';

var playTrack = function(track, callback) {
    var track = sp.Track.getFromUrl(track);
    track.on('ready', function() {

        player.load(track);
        player.play();
        //player.pipe(speaker);

        player.once('track-end', function() {
            callback()
        });
    });
}

var search = function(query, callback) {
    var searchobj = new sp.Search(query);
    searchobj.trackCount = 10;
    searchobj.execute();
    searchobj.once('ready', function() {
        if (!searchobj.tracks.length) {
            callback(searchobj, {
                err: "no results"
            })
        } else {
            callback(searchobj, null);
        }
    });
}

var playing = true;
var nowPlayingID = "cat";

var playNext = function() {
    if (playing && queue.length > 0) {
        player.stop();
        //speaker.close();
        //global.speaker = new Speaker();
        nowPlayingID = queue[0];
        playTrack("spotify:track:" + queue[0], function() {
            nowPlayingID = "cat";
            playNext();
        });
        queue.splice(0, 1);
    }
}

app.get("/nowplaying", function(req, res) {
    res.send(nowPlayingID);
});

app.get("/", function(req, res) {
    console.log(JSON.stringify(req.session));
    res.sendFile("index.html", {
        "root": __dirname
    });
});

app.get("/stream", function(req, res) {
    res.sendFile("stream.html", {
        "root": __dirname
    });
});

app.get('/login', function(req, res) {

    var state = generateRandomString(16);
    res.cookie(stateKey, state);

    // your application requests authorization
    var scope = 'playlist-read-private playlist-read-collaborative';
    res.redirect('https://accounts.spotify.com/authorize?' +
        querystring.stringify({
            response_type: 'code',
            client_id: client_id,
            scope: scope,
            redirect_uri: redirect_uri,
            state: state
        }));
});

app.get('/callback', function(req, res) {

    // your application requests refresh and access tokens
    // after checking the state parameter

    var code = req.query.code || null;
    var state = req.query.state || null;
    var storedState = req.cookies ? req.cookies[stateKey] : null;

    if (state === null || state !== storedState) {
        res.send({
            error: 'state_mismatch'
        });
    } else {
        res.clearCookie(stateKey);
        var authOptions = {
            url: 'https://accounts.spotify.com/api/token',
            form: {
                code: code,
                redirect_uri: redirect_uri,
                grant_type: 'authorization_code'
            },
            headers: {
                'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
            },
            json: true
        };

        request.post(authOptions, function(error, response, body) {
            if (!error && response.statusCode === 200) {

                var access_token = body.access_token,
                    refresh_token = body.refresh_token;
                console.log(access_token);
                req.session.auth = {
                    access_token: access_token,
                    refresh_token: refresh_token
                };
                var options = {
                    url: 'https://api.spotify.com/v1/me',
                    headers: {
                        'Authorization': 'Bearer ' + access_token
                    },
                    json: true
                };
                request.get(options, function(err, resp, body) {
                    if (!error && response.statusCode === 200) {
                        req.session.me = body;
                        console.log(body);
                        res.redirect('/');
                    } else {
                        res.send("error: " + error);
                    }
                })
            } else {
                res.redirect({
                    error: 'invalid_token'
                });
            }
        });
    }
});

app.get('/playsearch', function(req, res) {
    var query = req.query.song
    player.stop()
    setTimeout(function() {
        search(query, function(obj, err) {
            if (err) {
                this.emit('error', err)
            }
            var track = obj.tracks[0];
            res.send("Playing " + obj.tracks[0].title + " by " + obj.tracks[0].artists.toString(" ") + ". It is " + track.humanDuration + " long.")
            console.log("Playing " + obj.tracks[0].title + " by " + obj.tracks[0].artists.toString(" ") + ". It is " + track.humanDuration + " long.")
            playTrack(track.getUrl(), function() {
                console.log('done')
            });
        });
    }, 2000);
});

app.get('/stop', function(req, res) {
    if (player) {
        player.stop()
    }
    res.send('stopped')
})

app.get('/queue/add', function(req, res) {
    queue.push(req.query.id);
    if (queue.length === 1 && nowPlayingID === "cat") {
        playNext();
    }
    res.send('done');
});

app.get('/queue/remove', function(req, res) {
    queue.splice(queue.indexOf(req.query.id), 1);
    res.send('done')
});

app.get('/queue', function(req, res) {
    res.send(queue)
});

app.get('/play', function(req, res) {
    playNext();
    res.send('done')
});

app.get('/queue/addPlaylist', function(req, res) {
    if (!req.session.auth) {
        res.send({
            error: "You need to sign in."
        });
    } else {
        var options = {
            url: 'https://api.spotify.com/v1/users/' + req.session.me.id + '/playlists/' + req.query.id + '/tracks',
            headers: {
                'Authorization': 'Bearer ' + req.session.auth.access_token
            },
            json: true
        };
        console.log(options.url)
        request.get(options, function(err, resp, body) {
            console.log(body);
            body.items.forEach(function(i) {
                queue.push(i.track.id);
            });
            res.send('done');
        })
    }
});

app.get('/playlists', function(req, res) {
    if (req.session.me && req.session.auth) {
        var options = {
            url: 'https://api.spotify.com/v1/users/' + req.session.me.id + '/playlists',
            headers: {
                'Authorization': 'Bearer ' + req.session.auth.access_token
            },
            json: true
        };
        request.get(options, function(err, resp, body) {
            res.send(body.items.filter(function(e) {
                return (e.owner.id === req.session.me.id)
            }));
        });
    } else {
        res.send({
            error: "You need to sign in."
        })
    }
});

app.get('/search', function(req, res) {
    if (req.query.q) {
        search(req.query.q, function(search, err) {
            var results = []
            for (var i = 0; i < search.tracks.length; i++) {
                results.push(search.tracks[i].getUrl());
            };
            res.send(results)
        });
    }
});

server.on('connection', function(client) {
    var stream = client.createStream();
    player.pipe(stream);
});

app.listen(8000);
