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
var module = require("../Module/index.js");
//var google = require('googleapis');

// Used to make the server look in our directory for
// our javascript, css, and other files
app.use(express.static(dir));
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
cookieName: 'session',
secret: 'random_string_goes_here',
duration: 7 * 24 * 60 * 1000,
}));


app.use(bodyParser.json());

mongoClient.connect("mongodb://ersp:abc123@ds044917.mlab.com:44917/smart-lock", (err, database) => {

      app.listen(3000, function() {

            console.log("listening on 3000");
            module.connectServer();
            })
      })


// Route for accessing the site, sends back the homepage
app.get("/", (req, res) => {
      module.findUser("spg002@ucsd.edu");
      db = module.db;
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
    let email = req.query.email;
    let fullname = req.query.fullname;
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
   	if(result.length) {
      if(result[0].name == null) {
        db.collection("users").update({username: email}, {$set: {name: fullname}});
      }
   		if(result[0].locks.length == 0) {
   			res.send({locks: []});
   		}
   		else {
   			if(result[0].locks.length > 1) {
   			}
   			else {
   				req.session.lock = parseInt(result[0].locks[0]);
   			}
   			res.send({locks: result[0].locks});
   		}
   	}
   	else {
   		db.collection("users").insert({username: email, name: fullname, locks: []}, (err, doc) => {
   			res.send({locks: []});
   		})
   	}
   })
 })

// Route that redirects users to their lock dashboard, sends the dashboard page back
app.get("/dashboard", (req, res) => {
  if(!module.isLoggedIn(req.session.username)) {
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

app.get("/getLocks", (req, res) => {
      let lockNames = [];
      let lockIds = [];
      db.collection("users").find({username: req.session.username}).toArray((err, result) => {
            var locks = result[0].locks;
            async.each(locks, function(file, callback) {
                  db.collection("locks").find({lockId: file}).toArray((err, result) => {
                        lockNames.push(result[0].lockName);
                        lockIds.push(file);
                        callback();
                        })
                  }, function(err) {
                  res.send({locks: lockIds, lockNames: lockNames});
                  })
            })
      })

app.get("/getMembers", (req, res) => {
  let id = req.session.lock;
  module.getLockMembers(id, function(members) {res.send({members: members});});
})
 
   

app.get("/getName", (req, res) => {
  res.send(req.session.username);
})


// Route that redirects users to register their lock, sends registration page
app.get("/register", (req, res) => {
  if(!module.isLoggedIn(req.session.username)) {
    res.redirect("/");
    return;
  }
  res.sendFile(dir + "/views/register.html");
})


app.get("/lockStatus", (req, res) => {
  let id = req.session.lock;
  module.getLocks(id, function(locks) {res.send(locks);});
})

app.get("/memberRoleInfo", (req, res) => {
      let username = req.query.username;
      let lockId = req.session.lock;
      db.collection("roles").find({username: username, lockId: lockId}).toArray((err, result) => {
            if(!result[0]) {
            // did not find anyone with this username and lock that has a role
            var lockRestrictions = [];
            var unlockRestrictions = [];
            db.collection("roles").insert({username: username, lockId: lockId, lockRestrictions: lockRestrictions, unlockRestrictions: unlockRestrictions,
                  canAddMembers: true, canCreateRules: true, canManageRoles: true});
            res.send({roles: false});
            }
            else {
            res.send({roles: result[0]});
            }
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
      let time = module.getTime();
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
  let username = req.session.username;
  let lockId = req.session.lock;
  module.canAccess(username, lockId, function(roles) {
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
  module.getLockHistory(id, function(history) {
    history.times.push(history.owner);
    history.actions.push(history.owner);
    res.send({members: history.times, memActions: history.actions});
  });
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
      module.addMember(username,lockId, function(members) {res.send({members: members});});
      })
//remove member from lock 
app.post("/removeMember", (req, res) => {
      
})


//add time restrictions to when lock will be locked/unlocked
app.post("/addTimeRestriction", (req, res) => {
      //convert to military time

      let start = module.convertToMilitary(req.body.startTime);
      let end = module.convertToMilitary(req.body.endTime);

      module.createRole(req.body.action, req.body.username, req.session.lock, start, end, function(result) {
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
      module.createRule(req.session.lock, req.session.username, req.body.action, req.body.time);
})

//lock function
app.post("/lock", (req, res) => {
  module.lock(req.session.username, req.session.lock, function(result){
    if(result){
      res.send();
    }
    else{
      res.send({error: "You do not have permission to lock!"});
    }
  })

})

// Proccesses the lock registration in the database
app.post("/registerLock", (req, res) => {
      let id = parseInt(req.body.id);
      module.registerLock(req.session.username, id, req.body.lockName, function(result) {
            if(result) {
                  res.send({redirect: "/dashboard"});
            }
            else {
                  res.send({redirect:"failure"});
            }
      });
})

//unlock function
app.post("/unlock", (req, res) => {
      module.unlock(req.session.username, req.session.lock, function(result) {
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
      })


/* ---------------------- OTHER STUFF BELOW ---------------------- */

// Template function to do whatever you want every minute
