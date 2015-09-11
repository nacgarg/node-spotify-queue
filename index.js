var app = require('express')();
var express = require('express')
var sp = require('libspotify');
var cred = require('./spotify_key/passwd');
var io = require('socket.io')(app.listen(80));
var BinaryServer = require('binaryjs').BinaryServer;
var server = BinaryServer({port: 9000});
var Speaker = require('speaker');
var session = new sp.Session({
    applicationKey: __dirname + '/./spotify_key/spotify_appkey.key'
});

var queue = []

app.use(express.static('public'));

global.player = session.getPlayer();
global.speaker = new Speaker();
session.login(cred.login, cred.password);
session.once('login', function(err) {
    if (err) this.emit('error', err);
    console.log("logged in as " + cred.login)
});


var playTrack = function(track, callback) {
    var track = sp.Track.getFromUrl(track);
    track.on('ready', function() {

        player.load(track);
        player.play();
        player.pipe(speaker);

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
var nowPlayingID="cat";

var playNext = function() {
    if (playing && queue.length > 0) {
        player.stop();
        speaker.close();
        global.speaker = new Speaker();
        nowPlayingID=queue[0];
        playTrack("spotify:track:" + queue[0], function() {
            nowPlayingID="cat";
            playNext();
        });
        queue.splice(0, 1);
    }
}

app.get("/nowplaying",function(req,res){
    res.send(nowPlayingID);
});

app.get("/", function(req, res) {
    res.sendFile("index.html", {
        "root": __dirname
    });
});

app.get("/stream", function(req, res) {
    res.sendFile("stream.html", {
        "root": __dirname
    });
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
    if(queue.length===1){
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

server.on('connection', function(client){
    var stream = client.createStream();
    player.pipe(stream);
});
