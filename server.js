var express = require("express");
var mongoClient = require("mongodb").MongoClient;
var db = undefined;
var app = express();
var dir = __dirname;
var bodyParser = require('body-parser');
var session = require("client-sessions");
var async = require("async");
var schedule = require('node-schedule');
var d = new Date();
//var google = require('googleapis');




function isLoggedIn(user) {
  return((user != undefined));
} 

function getTime() {
  var d = new Date();
  var minutes = d.getMinutes();
  var hours = d.getHours();
  if (d.getMinutes() < 10) {
    minutes = "0" + minutes;
  }
  if (d.getHours() > 12) {
    hours = hours % 12;
  }
  var date = hours + ":" + minutes
  if (d.getHours()/12 == 0) {
    date = date + " AM";
  } else {
    date = date + " PM";
  }
  return date;
}

// Used to make the server look in our directory for 
  // our javascript, css, and other files
app.use(express.static(dir));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  cookieName: 'session',
  secret: 'random_string_goes_here',
  duration: 30 * 60 * 1000,
}));
app.use(bodyParser.json());

mongoClient.connect("mongodb://ersp:abc123@ds044917.mlab.com:44917/smart-lock", (err, database) => {
  if(err) {
    return console.log(err);
  }

  db = database.db("smart-lock");
  app.listen(3000, function() {
    console.log("listening on 3000");
  })
})


// Route for accessing the site, sends back the homepage
app.get("/", (req, res) => {

/*
  memberArray = [];
  for(var i = 0; i < 20; i++) {
    db.collection("locks").insert({lockId: i, lockName: null, owner: null, status:"locked", members: memberArray})
  }
*/  
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
   res.sendFile(dir + "/views/registerLock.html");
})
// Route for authenticating users after they log in via Google
  // Determines whether or not the user has a lock associated with them
app.get("/authenticate", (req, res) => {
  // User email is obtained from the Javascript function after user has logged 
    // in viga Google
  var email = req.query.email;
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
    if(result.length) {
      console.log("found a user with this username");
      if(result[0].locks.length == 0) {
        console.log("user does not have a lock associated");
        res.send({locks: []});
      }
      else {
        if(result[0].locks.length > 1) {
          console.log("user has more than 1 lock associated")
        }
        else {
          req.session.lock = parseInt(result[0].locks[0]);
          console.log("user has just 1 lock associated");
        }
        res.send({locks: result[0].locks});
      }
    }
    else {
      console.log("could not find user in database");
      db.collection("users").insert({username: email, locks: []}, (err, doc) => {
        res.send({locks: []});
      })
    }
  })
})

// Route that redirects users to their lock dashboard, sends the dashboard page back
app.get("/dashboard", (req, res) => {
  if(!isLoggedIn(req.session.username)) {
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
  console.log("lock id");
  console.log(typeof(req.session.lock));
  db.collection("locks").find({lockId: req.session.lock}).toArray((err, result) => {
    console.log(result);
    lockName = result[0].lockName;
    console.log(lockName);
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
      console.log(lockNames);
      res.send({locks: lockIds, lockNames: lockNames});
    })
  })
})

app.get("/getMembers", (req, res) => {
  var id = req.session.lock;
  var members = [];

  db.collection("locks").find({lockId: id}).toArray((err, result) => {
    members = result[0].members;
    members.push(result[0].owner);
    res.send({members: members});
  })
})

app.get("/getName", (req, res) => {
  res.send(req.session.username);
})


// Route that redirects users to register their lock, sends registration page
app.get("/register", (req, res) => {
  if(!isLoggedIn(req.session.username)) {
    res.redirect("/");
    return;
  }
  res.sendFile(dir + "/views/register.html");
})


app.get("/lockStatus", (req, res) => {
  db.collection("users").find({username: req.session.username}).toArray((err, result) => {
    var id = req.session.lock;
    db.collection("locks").find({lockId: id}).toArray((err, result) => {
      res.send(result[0]);
    })
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
    console.log(lockId);
    db.collection("locks").find({lockId: lockId}).toArray((err, result) => {
      console.log(result[0].members);
    })

  res.sendFile(dir + "/views/settings.html");
})

app.get("/timeStatus", (req, res) => {
  d = new Date();
  var minutes = d.getMinutes();
  var hours = d.getHours();
  var seconds = d.getSeconds();
  if (d.getMinutes() < 10) {
    minutes = "0" + minutes;
  }
  if (d.getHours() > 12) {
    hours = hours % 12;
  }
  if (d.getSeconds() < 10) {
    seconds = "0" + seconds;
  }
  var date = hours + ":" + minutes + ":" + seconds;
  if (d.getHours()/12 == 0) {
    date = date + " AM";
  } else {
    date = date + " PM";
  }
  res.send(date);
})





/* ---------------------- POST ROUTES BELOW ---------------------- */


app.post("/addMember", (req, res) => {
  var username = req.body.username;
  var lockId = req.session.lock

  db.collection("users").find({username: username}).toArray((err, result) => {
    if(!result.length) {
      console.log("no username found");
      res.send({message: "No user found with this email"});
      return;
    }
    else {
      var locksArray = result[0].locks;
      locksArray.push(lockId);
      db.collection("users").update({username: username}, {$set: {locks: locksArray}});
      db.collection("locks").find({lockId: lockId}).toArray((err, result) => {
        var members = result[0].members;
        username = username.toString();
        members.push(username);
        db.collection("locks").update({lockId: lockId}, {$set: {members: members}}, (err, numberAffected, rawResponse) => {
          res.send({message: "User successfully assigned to lock"});
        });
      })
      
    }
  })
})

app.post("/createRule", (req, res) => {
  console.log(req.body.action);
  console.log(req.body.time);
  var lockId = req.session.lock;
  db.collection("rules").insert({lockId: lockId, action: req.body.action, time: req.body.time});
})

app.post("/lock", (req, res) => {
  var username = req.session.username;
  var time = getTime();
  var date = new Date();
  date = date.toDateString();
  time = (date + " at " + time);
  db.collection("history").find({lockId: req.session.lock}).toArray((err, result) => {
    var names = result[0].names;
    var actions = result[0].actions;
    var times = result[0].times;
    names.push(username);
    actions.push("lock");
    times.push(time);
    db.collection("history").update({lockId: req.session.lock}, {$set: {names: names, actions: actions, times:times}});
  })

  db.collection("users").find({username: username}).toArray((err, result) => {
    var id = req.session.lock;
    db.collection("locks").update({lockId: id}, {$set: {status: "locked"}}, (err, numberAffected, rawResponse) => {
      res.send();
    })
  })
})

// Proccesses the lock registration in the database
app.post("/registerLock", (req, res) => {
  var username = req.session.username;

  // id gets sent as a string, so we must parse it as an integer
  var id = parseInt(req.body.id);
  db.collection("locks").find({lockId:  id}).toArray((err, result) => {

    if(result[0].owner == null) {
      var idArray = [];
      idArray.push(id);
      req.session.lock = parseInt(id);
      // lock does not have an owner? Then set the username and the owner properly
      db.collection("locks").update({lockId: id}, {$set: {owner: req.session.username}});
      db.collection("users").update({username: req.session.username}, {$set: {locks: idArray}});
      db.collection("locks").update({lockId: id}, {$set: {lockName: req.body.lockName}});
      res.send({redirect: "/dashboard"});
    }
    else {
      console.log("lock already taken");
      // lock was already registered with someone so we send back a failure
      res.send({redirect: "failure"});
    }
  })
})

app.post("/unlock", (req, res) => {
  var username = req.session.username;
  var time = getTime();
  var date = new Date();
  date = date.toDateString();
  time = (date + " at " + time);
  db.collection("history").find({lockId: req.session.lock}).toArray((err, result) => {
    var names = result[0].names;
    var actions = result[0].actions;
    var times = result[0].times;
    names.push(username);
    actions.push("unlock");
    times.push(time);
    db.collection("history").update({lockId: req.session.lock}, {$set: {names: names, actions: actions, times:times}});
  })
  db.collection("users").find({username: username}).toArray((err, result) => {
    var id = req.session.lock;
    db.collection("locks").update({lockId: id}, {$set: {status: "unlocked"}}, (err, numberAffected, rawResponse) => {
      res.send();
    })
  })
})


/* ---------------------- OTHER STUFF BELOW ---------------------- */

// Template function to do whatever you want every minute
var j = schedule.scheduleJob('*/1 * * * *', function(){
  var time = getTime();
  db.collection("rules").find({time: time}).toArray((err, result) => {
    if(result.length) {
      console.log("found rules")
    }
    else {
      console.log("did not find rules");
    }
  })
});
