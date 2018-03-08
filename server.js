var express = require("express");
var mongoClient = require("mongodb").MongoClient;
var db = "hello";
var app = express();
var dir = __dirname;
var bodyParser = require('body-parser');
var session = require("client-sessions");
var async = require("async");
var schedule = require('node-schedule');
var d = new Date();
var module = require("../Module/index.js");
//var google = require('googleapis');

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

  app.listen(3000, function() {

    console.log("listening on 3000");
    module.connectServer();
  })
})


// Route for accessing the site, sends back the homepage
app.get("/", (req, res) => {
  module.findUser("spg002@ucsd.edu");
  db = module.db;
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

app.get("/authenticate", (req, res) => {
  // User email is obtained from the Javascript function after user has logged
    // in viga Google
    var email = req.query.email;
    var fullname = req.query.fullname;
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
    console.log("found a user!");
   	req.session.username = email;
    req.session.fullname = fullname;
    //If the user exists, redirect the user according to the number of locks he has
    if(result.length) {
      if(result[0].name == undefined){
        result[0].push(req.body.name);
      }
      if(result[0].locks.length == 0) {
        res.send({locks: []});
      }
      else {
       req.session.lock = parseInt(result[0].locks[0]);
       res.send({locks: result[0].locks});
     }
   }
   //If the user does not exist, create a document for the user in the database and redirect him to register page
   else{
    console.log("user not found, creating new document in the database");
    db.collection("users").insert({username: email, name: fullname, locks: [], 
      roles: [], lockRestrictions: [], unlockRestrictions: []}, (err, doc) => {
        res.send({locks:[]});})
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
  var lockName = undefined;
  var username = undefined;
  db.collection("locks").find({lockId: req.session.lock}).toArray((err, result) => {
    if(result[0].lockName == undefined){
      lockName = result[0].lockId;}
      else{
        lockName = result[0].lockName;}
        username = req.session.username;
        res.send({username: req.session.username, lockName: lockName});
      })

})

 app.get("/getLocks", (req, res) => {
  var lockNames = [];
  var lockIds = [];
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
  var id = req.session.lock;
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
  var id = req.session.lock;
  module.getLocks(id, function(locks) {res.send(locks);});
})

app.get("/memberRoleInfo", (req, res) => {
  var username = req.query.username;
  var lockId = req.session.lock;
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
  var time = module.getTime();
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
      var id = req.session.lock;
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
  var username = req.body.username;
  var lockId = req.session.lock;
      //call the module
      module.addMember(username,lockId, function(members) {res.send({members: members});});
    })

//add time restrictions to when lock will be locked/unlocked
app.post("/addTimeRestriction", (req, res) => {
      //convert to military time

      var start = module.convertToMilitary(req.body.startTime);
      var end = module.convertToMilitary(req.body.endTime);

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

//   db.collection("roles").find({username: username, lockId: req.session.lock}).toArray((err, result) => {
//     if(result[0]) {
//       var lockRestrictons = result[0].lockRestrictions;
//     }
//   db.collection("locks").find({lockId: req.session.lock}).toArray((err, result) => {
//   owner = (result[0].owner == username);
//   if(owner || module.checkActionPermission(lockRestrictons, module.convertToMilitary(time))) {
//     var date = new Date();
//     date = date.toDateString();
//     time = (date + " at " + time);
//     db.collection("history").find({lockId: req.session.lock}).toArray((err, result) => {
//     var names = result[0].usernames;
//     var actions = result[0].actions;
//     var times = result[0].times;
//     names.push(username);
//     actions.push("lock");
//     times.push(time);
//     db.collection("history").update({lockId: req.session.lock}, {$set: {usernames: names, actions: actions, times:times}});
//   })

//     db.collection("users").find({username: username}).toArray((err, result) => {
//       var id = req.session.lock;
//       db.collection("locks").update({lockId: id}, {$set: {status: "locked"}}, (err, numberAffected, rawResponse) => {
//       res.send();
//    })
//   })
// }
//   else {
//     res.send({error:"You do not have permission to do this!"});
//     }
//   })
// })

})

// Proccesses the lock registration in the database
app.post("/registerLock", (req, res) => {
  var id = parseInt(req.body.id);
  let username = req.body.username;
  console.log("user Name in server.js: " + req.body.userName);
  console.log("lock Name in server.js: " + req.body.lockName);
  module.registerLock(id, req.body.lockName, req.body.userName, function(result) {
    if(result) {
      db.collection("locks").find({owner: username}).toArray((err, result) => {
      let lockId = result[0].lockId;
      console.log("lockId in server.js: " + lockId);
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
  var username = req.body.username;
  var lockId = req.session.lock;
      //use boolean values to set roles 
      var canAddMembers = (req.body.canAddMembers == "true");
      var canCreateRules = (req.body.canCreateRules == "true");
      var canManageRoles = (req.body.canManageRoles == "true");
      //update 
      db.collection("roles").update({username: username, lockId: lockId}, {$set: {canAddMembers: canAddMembers, canCreateRules: canCreateRules, canManageRoles: canManageRoles}})
    })


/* ---------------------- OTHER STUFF BELOW ---------------------- */

// Template function to do whatever you want every minute
