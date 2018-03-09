"use strict";
const express = require("express");
const mongoClient = require("mongodb").MongoClient;
let db = "hello";
const app = express();
let dir = __dirname;
let bodyParser = require('body-parser');
let  session = require("client-sessions");
const async = require("async");
const schedule = require('node-schedule');
let  d = new Date();
//var google = require('googleapis');

const mod = require("../Module/index.js");
const server = require("http").Server(app);
const socket = require("socket.io")(server);

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

mongoClient.connect("mongodb://ersp:abc123@ds044917.mlab.com:44917/smart-lock", (err, database) => {

      server.listen(3000, function() {

            console.log("listening on 3000");
            mod.connectServer();
            })
      })


var dashboard = socket.of("/dashboardConnection");
dashboard.on("connection", function(socket) {
      console.log("Connected to dashboard socket from server end");
      socket.on("request", function(data) {
            console.log(data);

            // Do all of the lock stuff here....

            socket.emit("response", "response string");
      })
})

// Route for accessing the site, sends back the homepage
app.get("/", (req, res) => {

  db = mod.db;

  // db.collection("users").find({"locks.lockId": 49}, {"locks.$": 1, _id : 0 }).toArray((err, result) => {
  //   if(result.length > 0) {
  //     console.log("found some locks");
  //     console.log(result);
  //   }
  //   else {
  //     console.log("could not find any locks");
  //     console.log(result);
  //   }
  // })

//   for (var i = 50; i >= 1; i--) {
//   db.collection("locks").insert({lockId: i, lockName: null, owner: null, status: "locked", members: [], }, (err, doc) => {
//         res.send();
//       })
// }
  res.sendFile(dir + "/views/login.html");
})

app.get("/addMembers", (req, res) => {
  res.sendFile(dir + "/views/addMembers.html");
})

app.get("/addRoles", (req, res) => {
  res.sendFile(dir + "/views/addRoles.html");
})

app.get("/addRules", (req, res) => {
  res.sendFile(dir + "/views/addRules.html");
})

app.get("/registerLock", (req, res) => {
      res.sendFile(dir + "/views/register.html");
      })

app.get("/editAdmins", (req, res) => {
   res.sendFile(dir+ "/views/editAdmins.html");
})

// Route for authenticating users after they log in via Google
  // Determines whether or not the user has a lock associated with them

app.get("/authenticate", (req, res) => {
  // User email is obtained from the Javascript function after user has logged
    // in viga Google
  var email = req.query.email;
  var fullname = req.query.fullname;
  console.log("EMAIL " + email);
  /**
   * Determines whether or not the user has a lock associated through steps
   * - Attempt to see if the user is in the database with their email
   *    - If the resulting array != 0, then we found a user in the database
   *      - If the lock id associated is null, then the user needs to register their lock
   *      - Else the user has a lock associated and we can send them to the dashboard
   *    - Else the resulting array size == 0, then we must first add the user to the
   *      database before redirecting them to register their lock
   */
  db.collection("users").find({username: email}).toArray((err, result) => {
   	req.session.username = email;
    req.session.fullname = fullname;
    //If the user exists, redirect the user according to the number of locks he has
    if(result.length) {
      // if(result[0].name == undefined){
      //   result[0].push(req.body.name);
      // }
      if(result[0].locks.length == 0) {
        res.send({locks: []});
      }
      else {
       req.session.lock = parseInt(result[0].locks[0].lockId);
       res.send({locks: result[0].locks});
      }
    }
   //If the user does not exist, create a document for the user in the database and redirect him to register page
    else {
      db.collection("users").insert({username: req.session.username, name: fullname, locks: [], }, (err, doc) => {
        res.send({locks:[]});})
    }
  })
})


// Route that redirects users to their lock dashboard, sends the dashboard page back
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
      let lockName = undefined;
      let username = undefined;
      db.collection("locks").find({lockId: req.session.lock}).toArray((err, result) => {
            lockName = result[0].lockName;
            username = req.session.username;
            res.send({username: req.session.username, lockName: lockName});
            })
          })

 app.get("/dashboardInformation", (req, res) => {

  mod.getLockInfo(req.session.lock, req.session.username, function(data) {
    res.send(data);
  })
})

app.get("/getLocks", (req, res) => {
  mod.getLocks(req.session.username, function(data) {
    res.send(data);
  })
})

app.get("/getMembers", (req, res) => {
  let id = req.session.lock;
  mod.getLockMembers(id, function(members) {res.send({members: members});});
})

 app.get("/getMembers", (req, res) => {
  var id = req.session.lock;
  mod.getLockMembers(id, function(members) {res.send({members: members});});
})
 


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


app.get("/lockStatus", (req, res) => {
  mod.getLockStatus(req.session.lock, function(data) {
    res.send(data);
  })
})


app.get("/selectLock", (req, res) => {
  res.sendFile(dir + "/views/locks.html");
})

app.get("/selectDashboard", (req, res) => {
  req.session.lock = parseInt(req.query.lockId);
  res.send();
})

app.get("/settings", (req, res) => {
  lockId = req.session.lock;
      //db.collection("locks").find({lockId: lockId}).toArray((err, result) => {
        //    })

        res.sendFile(dir + "/views/settings.html");
      })


app.get("/switchLock", (req, res) => {
  req.session.lock = parseInt(req.query.lockId);
  res.send();
})


app.get("/timeStatus", (req, res) => {

      let time = mod.getTime();

      res.send(time);
})


/*app.get("/canAccessAddMembers", (req, res) => {
      var username = req.session.username;
      var lockId = req.session.lock;
      db.collection
      db.collection("roles").find({username: username, lockId: lockId}).toArray((err, result) => {
            res.send({roles: result[0]});
      })
    })*/

    app.get("/canAccess", (req, res) => {
      var username = req.session.username;
      var lockId = req.session.lock;
      mod.canAccess(username, lockId, function(roles) {
        res.send({roles: roles});
      });
    });


app.get("/canAccess", (req, res) => {
  let username = req.session.username;
  let lockId = req.session.lock;
  mod.canAccess(username, lockId, function(roles) {
    res.send({roles: roles});
  });
/*
  db.collection("locks").find({lockId: lockId}).toArray((err, result) => {
      var owner = (username = result[0].owner);
      db.collection("roles").find({username: username, lockId: lockId}).toArray((err, result) => {
            if(owner || result[0].canCreateRules) {
                  res.send({access: true});
            }
            else {
                  res.send({access:false});
            }
        })
      })*/

    })

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

    app.get("/signOut", (req, res) => {
     req.session.reset();
     res.send();
   })

 /*app.get("/showHistory", (req, res) => {
  var id = req.session.lock;
  var members1 = [];

  db.collection("history").find({lockId: id}).toArray((err, result) => {
    members = result[0].members;
    members.push(result[0].owner);
    res.send({members: members});
  })
})*/


/* ---------------------- POST ROUTES BELOW ---------------------- */

//add member who can access lock
app.post("/addMember", (req, res) => {

      let username = req.body.username;
      let lockId = req.session.lock;
      //call the module
      mod.addMember(username,lockId, function(members) {res.send({members: members});});

      //call the mod
      mod.addMember(username,lockId, function(members) {res.send({members: members});});
      })
//remove member from lock 
app.post("/removeMember", (req, res) => {
      
})


//add time restrictions to when lock will be locked/unlocked
app.post("/addTimeRestriction", (req, res) => {
      //convert to military time


      let start = mod.convertToMilitary(req.body.startTime);
      let end = mod.convertToMilitary(req.body.endTime);


      mod.createRole(req.body.action, req.body.username, req.session.lock, start, end, function(result) {
            if(result) {
                  res.send();
            }
            else {
                  res.send({error: "error message"});
            }
      })
    })

//rule for lock
app.post("/createRule", (req, res) => {
      mod.createRule(req.session.lock, req.session.username, req.body.action, req.body.time);
})

//lock function
app.post("/lock", (req, res) => {
  mod.lock(req.session.username, req.session.lock, function(result){
    if(result){
      res.send();
    }
    else{
      res.send({error: "You do not have permission to lock!"});
    }
  })
});


// Proccesses the lock registration in the database
app.post("/registerLock", (req, res) => {
      let id = parseInt(req.body.id);
      mod.registerLock(req.session.username, id, req.body.lockName, function(result) {
            if(result) {
                  res.send({redirect: "/dashboard"});
            }
            else {
                  res.send({redirect:"failure"});
            }
      });

  let username = req.session.username;
  console.log("user Name in server.js: " + req.session.username);
  console.log("lock Name in server.js: " + req.body.lockName);
  mod.registerLock(id, req.body.lockName, req.session.username, function(result) {
  // let username = req.body.username;
  // mod.registerLock(id, req.body.lockName, req.body.userName, function(result) {
    if(result) {
      db.collection("locks").find({owner: username}).toArray((err, result) => {
      var lockId = parseInt(result[0].lockId);
      req.session.lock = lockId;
      res.send({redirect: "/dashboard"});
    })}
    else {
      res.send({redirect:"failure"});
    }
  });
})

//unlock function
app.post("/unlock", (req, res) => {
      mod.unlock(req.session.username, req.session.lock, function(result) {
            if(result) {
                  res.send();
            }
            else {
                  res.send({error:"You do not have permission to do this!"});
            }
      })
})

//update role in data base
app.post("/updateRole", (req, res) => {
      let username = req.body.username;
      let lockId = req.session.lock;

      //use boolean values to set roles 
      let canAddMembers = (req.body.canAddMembers == "true");
      let canCreateRules = (req.body.canCreateRules == "true");
      let canManageRoles = (req.body.canManageRoles == "true");
      //update 
      db.collection("roles").update({username: username, lockId: lockId}, {$set: {canAddMembers: canAddMembers, canCreateRules: canCreateRules, canManageRoles: canManageRoles}})
    });


/* ---------------------- OTHER STUFF BELOW ---------------------- */

// Template function to do whatever you want every minute
