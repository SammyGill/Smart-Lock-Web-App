// lock with ID = 1s
const io = require('socket.io-client');
"use strict";
const socket = io.connect('http://100.81.33.111:3000', {reconnect: true,
              query: "lockId=20"});
const Gpio = require("pigpio").Gpio;
const GPIO = require("rpi-gpio");
const motor = new Gpio(22, {mode:Gpio.OUTPUT});
motor.enableInterrupt(Gpio.EITHER_EDGE);

GPIO.setup(11, GPIO.DIR_IN);

var pulseWidth = 1000;
var increment = 100;
console.log("on");
// Add a connect listener
socket.on('connect', function (data) {
    console.log('Connected!');
});

socket.on("disconnect", function(data) {
	motor.servoWrite(1000);
})

socket.on("defaultState", function(state) {
	if(state == "locked") {
		motor.servoWrite(1200);
	}
	else {
		motor.servoWrite(1400);
	}
})

socket.on("lock", function(data) {
	console.log("got a lock request");
	console.log(motor.getPwmFrequency());
	let beforeVal;
	let afterVal;
	GPIO.read(11, function(err, value) {
		if (err) throw err;
		beforeVal = value;
	});
	if (beforeVal == false) {
		motor.servoWrite(1800);
		setTimeout(
			GPIO.read(11, function(err, value2) {
				if (err) throw err;
				afterVal = value2;
			});
			if (afterVal == false) {
				//turn motor back
				console.log("ERROR");
			}
		, 3000);
	}
})

socket.on("unlock", function(data) {
	console.log("got an unlock request");
	console.log(motor.getPwmFrequency());
	motor.servoWrite(1000);
	//wait 3 seconds
	//check metal touch sensor
	//if touch sensor returns true then, turn serve back and send error message
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


