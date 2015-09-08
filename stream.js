var binaryjs = require('binaryjs');
var speaker = new require('speaker')();
var client = new binaryjs.BinaryClient('ws://'+ (process.argv[2] || "emraldia.com")+':9000');

client.on('stream', function(stream, meta) {
	stream.pipe(speaker)
});
