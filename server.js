"use strict";
const express = require("express");
const mongoClient = require("mongodb").MongoClient;
const app = express();
let dir = __dirname;
let bodyParser = require('body-parser');
let session = require("client-sessions");
const async = require("async");
let  d = new Date();

const mod = require("../Module/index.js");
const server = require("http").Server(app);
const io = require("socket.io")(server);
const assert = require("assert");



/*const Gpio = require("onoff").Gpio;
const greenLED = new Gpio(4, "out");
const pushButton = new Gpio(17, "in", "both"); //may not need the button
const redLED = new Gpio(27, "out");*/

// Used to make the server look in our directory for
// our javascript, css, and other files
app.use(express.static(dir));
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
  cookieName: 'session',
  secret: 'random_string_goes_here',
//duration: 7 * 24 * 60 * 1000,
duration: 10 * 1000,
}));


app.use(bodyParser.json());

/**
 * Connects server to mongo database and allows us to view apllication in
 * browser
 */
mongoClient.connect("mongodb://ersp:abc123@ds044917.mlab.com:44917/smart-lock", (err, database) => {

  server.listen(3000, function() {

    console.log("listening on 3000");
    mod.connectServer();
  })
})
io.on('connection', function (socket){
  mod.getDefaultState(parseInt(socket.handshake.query.lockId), function(state) {
    socket.emit("defaultState", state);
  })
  socket.on("disconnect", function(data) {
    mod.deleteActiveLock({socketId: socket.id});
  })

});

io.use(function(socket, next) {
  let data = socket.request;
  // Need to change below. Should be checking if it is a valid lock ID rather than
    // whether a lock ID was provided 
  if(!data._query.lockId) {
    io.sockets.connected[socket.id].disconnect();
  }
  else {
    mod.insertActiveLock({lockId: parseInt(data._query.lockId), socketId: socket.id});
    console.log(socket.id);
    next();
  }
})

// Route for accessing the site, sends back the homepage
app.get("/", (req, res) => {

  res.sendFile(dir + "/views/login.html");
})

//route for addMembers page
app.get("/addMembers", (req, res) => {
  res.sendFile(dir + "/views/addMembers.html");
})

/*app.get("/addRoles", (req, res) => {
  res.sendFile(dir + "/views/addRoles.html");
})
*/

//route for addEvents page
app.get("/addEvents", (req, res) => {
  res.sendFile(dir + "/views/addEvents.html");
})

//route for registerLock page
app.get("/registerLock", (req, res) => {
  res.sendFile(dir + "/views/register.html");
})

//route for editAdmins page
app.get("/editAdmins", (req, res) => {
 res.sendFile(dir+ "/views/editAdmins.html");
})

// Route for authenticating users after they log in via Google
  // Determines whether or not the user has a lock associated with them

//Authenticates the user through email 
  app.get("/authenticate", (req, res) => {
  // User email is obtained from the Javascript function after user has logged
    // in viga Google
  var email = req.query.email;
  var fullname = req.query.fullname;
  req.session.fullname = fullname;
  req.session.username = email;
  mod.authenticate(email, fullname, function(locks, lockId) {
    if(lockId) {
      req.session.lock = lockId;
    }
    res.send(locks);
  })
  })

//Route that redirects users to their lock dashboard, sends the dashboard page back
app.get("/dashboard", (req, res) => {
  if(!mod.isLoggedIn(req.session.username)) {
    res.redirect("/");
    return;
  }
  res.sendFile(dir + "/views/dashboard.html");
})

/**
 * This route is only used to send back the personal data of the user
 * back to the Javascript function that loads the dashboard. This
 * is because the dashboard will contain some information personalized
 * to the user.
 */
 app.get("/dashboardInformation", (req, res) => {

  mod.getLockInfo(req.session.lock, req.session.username, function(data) {
    res.send(data);
  })
})
//gets the locks using username 
 app.get("/getLocks", (req, res) => {
  mod.getLocks(req.session.username, function(data) {
    res.send(data);
  })
})

//get the settings for user with username and lock
 app.get("/getSettings", (req, res) => {
  mod.getSettings(req.session.username, req.session.lock, function(data) {
    console.log("getSettings in server.js: " + data);
    res.send(data);
  })
})

//gets the members of a lock using lock id 
 app.get("/getMembers", (req, res) => {
  let id = req.session.lock;
  mod.getLockMembers(id, function(members) {res.send({members: members});});
})

//gets the lock admins 
 app.get("/getAdmins", (req, res) => {
    let id = req.session.lock;
    console.log("went through getAdmins in server.js");
    //let username = req.body.members;
  mod.getLockAdmins(id, function(members) {
    console.log("members in server.js: " + members);
    res.send({members: members});});
 })
 
 //gets the users name from email username
 app.get("/getName", (req, res) => {
  res.send(req.session.username);
})


// Route that redirects users to register their lock, sends registration page
app.get("/register", (req, res) => {
  if(!mod.isLoggedIn(req.session.username)) {
    res.redirect("/");
    return;
  }
  res.sendFile(dir + "/views/register.html");
})

//gets the status (locked/unlocked) of a specific lock
app.get("/lockStatus", (req, res) => {
  mod.getLockStatus(req.session.lock, function(data) {
    console.log("in server.js, the getLocksStatus: " + data[0]);
    res.send(data);
  })
})

//selet lock to view
app.get("/selectLock", (req, res) => {
  res.sendFile(dir + "/views/locks.html");
})

//slect dashoard to be displayed 
app.get("/selectDashboard", (req, res) => {
  req.session.lock = parseInt(req.query.lockId);
  console.log("req.session.lock " + req.session.lock);
  mod.getSocketId(parseInt(req.session.lock), function(socketId) {
    if(!socketId) {
      // send them to the lock not active page
    }
    else {
      console.log("res.send()")
      res.send();
    }
  })
})

//switch lock using lock id of lock to switch to 
app.get("/switchLock", (req, res) => {
  req.session.lock = parseInt(req.query.lockId);
  res.send();
})

//switch settings 
app.get("/switchSettings", (req, res) => {
  console.log("the botton clicked is: " + req.query.setting);
  mod.switchSettings(req.query.setting, function(data) {
    console.log("the data sent in server.js is: " + data);
    res.send(data);
  })
})

//gets the time status 
app.get("/timeStatus", (req, res) => {
  let time = mod.getTime();
  res.send(time);
})


//there is no mod.canAccess function so this might be a problem. not sure where it's being used
/*app.get("/canAccess", (req, res) => {
  let username = req.session.username;
  let lockId = req.session.lock;
  mod.canAccess(username, lockId, function(roles) {
    res.send({roles: roles});
  });
});*/

//gets the history of specific lock 
app.get("/showHistory", (req, res) => {
  let id = req.session.lock;
  mod.getLockHistory(id, function(history) {

    var id = req.session.lock;
    mod.getLockHistory(id, function(history) {
      history.times.push(history.owner);
      history.actions.push(history.owner);
      res.send({members: history.times, memActions: history.actions});
    });
  })
})

//signs out of session
app.get("/signOut", (req, res) => {
 req.session.reset();
 res.send();
})


/* ---------------------- POST ROUTES BELOW ---------------------- */

//add member who can access lock
app.post("/addMember", (req, res) => {
  let username = req.session.username;
  let userToAdd = req.body.username;
  let lockId = req.session.lock;
  //call the module
  mod.addMember(username, userToAdd, lockId, function(result) {
    res.send(result);
  });
})

//remove member from lock 
app.post("/removeMember", (req, res) => {
  let username = req.session.username;
  let userToRemove = req.body.username;
  let lockId = req.session.lock;
  //call the module
  console.log("The user to remove is " + userToRemove)
  mod.removeMember(username, lockId, userToRemove, function(result) {
    res.send(result);
  });
})

//add admin (changes role of user from 2 to 1)
app.post("/addAdmin", (req, res) => {
   let username = req.session.username;
   let userToAdmin = req.body.username;
   let lockId = req.session.lock;

   mod.addAdmins(username, userToAdmin, lockId, function(result) {
      res.send(result);
   });
})

app.post("/revokeAdmin", (req,res) => {
  let username = req.session.username;
  let otherUser = req.body.username;
  let lockId = req.session.lock;
  console.log("in server.js, the otherUser is: " + otherUser);

  mod.revokeAdmin(username, lockId, otherUser, function(result) {
    res.send(result);
  });
})

//add time restrictions to when lock will be locked/unlocked
app.post("/addTimeRestriction", (req, res) => {
  let start = mod.convertToMilitary(req.body.startTime);
  let end = mod.convertToMilitary(req.body.endTime);

  mod.createRole(req.session.username, req.body.action, req.body.username, req.session.lock, 
                 start, end, function(result) {
    if(result) {
      res.send();
    }
    else {
      res.send({error: "error message"});
    }
  })
})

//rule for lock
app.post("/createEvent", (req, res) => {
  mod.createEvent(req.session.lock, req.session.username, req.body.action, req.body.time, function(result) {
    res.send(result);
  });
})

//lock function
app.post("/lock", (req, res) => {
  mod.lock(req.session.username, req.session.lock, function(result){
    if(result){
      console.log("lock request");
      mod.getSocketId(req.session.lock, function(socketId) {
        io.to(socketId).emit("lock", "lock message");
        res.send();       
      })
    }
    else{
      res.send({error: "You do not have permission to lock!"});
    }
  })
});


// Proccesses the lock registration in the database
app.post("/registerLock", (req, res) => {
  let id = parseInt(req.body.id);
  let username = req.session.username;
  
  //console.log("user Name in server.js: " + req.session.username);
  //console.log("lock Name in server.js: " + req.body.lockName);
  mod.registerLock(id, req.body.lockName, req.session.username, function(result) {
  // let username = req.body.username;
  // mod.registerLock(id, req.body.lockName, req.body.userName, function(result) {
    if(result) {
      req.session.lock = id;
      res.send({redirect: "/dashboard"});
    }
    else {
      res.send({redirect:"failure"});
    }
  });
})

//unlock function
app.post("/unlock", (req, res) => {
  mod.unlock(req.session.username, req.session.lock, function(result) {
    if(result) {
      mod.getSocketId(req.session.lock, function(socketId) {
        io.to(socketId).emit("unlock", "message for unlock");
        res.send();
      })
    }
    else {
      res.send({error:"You do not have permission to do this!"});
    }
  })
})



/* ---------------------- OTHER STUFF BELOW ---------------------- */

// Template function to do whatever you want every minute
