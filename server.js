// lock with ID = 1s
const io = require('socket.io-client');
"use strict";
const socket = io.connect('http://100.91.160.60:3000', {reconnect: true,
              query: "lockId=5"});
const Gpio = require("pigpio").Gpio;
const motor = new Gpio(22, {mode:Gpio.OUTPUT});
motor.enableInterrupt(Gpio.EITHER_EDGE);

var pulseWidth = 1000;
var increment = 100;

// Add a connect listener
socket.on('connect', function (data) {
    console.log('Connected!');
});

socket.on("disconnect", function(data) {
	motor.servoWrite(1800);
})

socket.on("defaultState", function(state) {
	if(state == "locked") {
		motor.servoWrite(1800);
	}
	else {
		motor.servoWrite(1000);
	}
})

socket.on("lock", function(data) {
	console.log("got a lock request");
	console.log(motor.getPwmFrequency());
	motor.servoWrite(1800);
})

socket.on("unlock", function(data) {
	console.log("got an unlock request");
	console.log(motor.getPwmFrequency());
	motor.servoWrite(1000);
})

process.on("exit", function() {
	console.log("test");
	motor.servoWrite(1000);
})

process.on("SIGINT", function() {
	process.exit();
});

function onEnd() {
	motor.servoWrite(1000);
}


