// lock with ID = 1s
var io = require('socket.io-client');
var socket = io.connect('http://100.81.37.21:3000', {reconnect: true});

// Add a connect listener
socket.on('connect', function (data) {
    console.log('Connected!');
    socket.emit("identification", 1);
});

// What we need to work on
// What happens when the lock powers up?
// What happens when the lock disconnects?
