var binaryjs = require('binaryjs');
var speaker = new require('speaker')();
var client = new binaryjs.BinaryClient('ws://'+process.env.SP_STREAM_HOST+':9000');

client.on('stream', function(stream, meta) {
	stream.pipe(speaker)
});