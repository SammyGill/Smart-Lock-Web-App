// lock with ID = 1s
const io = require('socket.io-client');
const socket = io.connect('http://100.81.37.21:3000', {reconnect: true,
							query: "token=test"});

// Add a connect listener
socket.on('connect', function (data) {
    console.log('Connected!');
    socket.emit("identification", 5);
});

socket.on("lock", function(data) {
	console.log("got a lock request");
	console.log(data);
})

socket.on("unlock", function(data) {
	console.log("got an unlock request");
	console.log(data);
})

