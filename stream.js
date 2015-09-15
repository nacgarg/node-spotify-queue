var binaryjs = require('binaryjs');
var speaker = new require('speaker')();
var lame = require('lame');
var decoder = new lame.Decoder({
    channels: 2,
    bitDepth: 16,
    sampleRate: 44100,
    bitRate: 128,
    outSampleRate: 22050,
    mode: lame.STEREO
});
var client = new binaryjs.BinaryClient('ws://' + (process.argv[2]) + ':9000');

client.on('stream', function(stream, meta) {
    stream.pipe(decoder).pipe(speaker)
});
