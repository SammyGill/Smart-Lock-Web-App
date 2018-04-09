// lock with ID = 1s
var io = require('socket.io-client');
var socket = io.connect('http://100.81.37.21:3000', {reconnect: true});

// Add a connect listener
socket.on('connect', function (data) {
    console.log('Connected!');
    socket.emit("identification", 1);
});

socket.on("lock", function(data) {
	console.log("got a lock request");
})

socket.on("welcome", function(id) {
	console.log("welcome lock " + id);
})

