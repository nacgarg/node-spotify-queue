# node-spotify-queue

A Node.js app that lets users control music playback on the host computer. You can also stream music from the host to any other computer that can run Node.js.

**You will need a Spotify Premium account to use this**.

###Setup
First make sure that libspotify is installed. You can download it [here](https://developer.spotify.com/technologies/libspotify/).

Then install dependencies using `npm install`.

Get your spotify key [here.](https://devaccount.spotify.com/my-account/keys/)

Make a directory called `spotify_key/`, and save your spotify key as `spotify_appkey.key` in that directory.

Then make a file called `passwd.js` under `spotify_key/` which looks like this. Make sure to replace the placeholders with your Spotify username and password.

```js
module.exports = {login:"USERNAME", password:"PASSWORD"}
```

###Running
To start the server, run `node index.js`.

To stream from the original server, set an environment variable called `SP_STREAM_HOST` to the hostname or IP of the server you started above. Then just run `node stream.js`.

