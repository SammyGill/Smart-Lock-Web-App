var express = require("express");
var mongoClient = require("mongodb").MongoClient;
var db = undefined;
var app = express();
var dir = __dirname;
var bodyParser = require('body-parser');
var session = require("client-sessions");
var d = new Date();
//var google = require('googleapis');



function isLoggedIn(user) {
  return((user != undefined));
} 

// Used to make the server look in our directory for 
  // our javascript, css, and other files
app.use(express.static(dir));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  cookieName: 'smartlocksession',
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
  res.sendFile(dir + "/views/login.html");
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
  db.collection("users").find({user: email}).toArray((err, result) => {
    req.smartlocksession.username = email;
    console.log(result.length);
    if(result.length) {
      console.log(result[0]);
      if(result[0].lockId === null) {
        res.send({redirect: "/register"});
      }
      else {
        res.send({redirect: "/dashboard"});
      }
    }
    else {
      db.collection("users").insert({user: email, lockId: null, role: null}, (err, doc) => {
        res.send({redirect: "/register"});
      })
    }
  })
})

// Route that redirects users to their lock dashboard, sends the dashboard page back
app.get("/dashboard", (req, res) => {
  if(!isLoggedIn(req.smartlocksession.username)) {
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
  res.send(req.smartlocksession.username);
})

//This gets the users name and displays it on the dashboard
/*var gmail = google.gmail({
   auth:auth,
   version: 'v1'
});

gmail.users.getProfile({
   auth: auth,
   userId: 'me'
}, function(err, res) {
   if(err) {
      console.log(err);
   } else {
        console.log(res);
     }
});
*/
// Route that redirects users to register their lock, sends registration page
app.get("/register", (req, res) => {
  if(!isLoggedIn(req.smartlocksession.username)) {
    res.redirect("/");
    return;
  }
  res.sendFile(dir + "/views/register.html");
})

app.get("/lockStatus", (req, res) => {
  db.collection("users").find({user: req.smartlocksession.username}).toArray((err, result) => {
    var id = result[0].lockId;
    db.collection("locks").find({lockId: id}).toArray((err, result) => {
      res.send(result[0]);
    })
  })
})


app.get("/settings", (req, res) => {
  db.collection("users").find({user: req.smartlocksession.username}).toArray((err, result) => {
    lockId = result[0].lockId;
    db.collection("locks").find({lockId: lockId}).toArray((err, result) => {
      console.log(result[0].members);
    })
  })
  res.sendFile(dir + "/views/settings.html");
})

app.get("/timeStatus", (req, res) => {
  d = new Date();
  var minutes = d.getMinutes();
  var hours = d.getHours();
  if (d.getMinutes() < 10) {
    minutes = "0" + minutes;
  }
  if (d.getHours() > 12) {
    hours = hours % 12;
  }
  var date = hours + ":" + minutes + ":" + d.getSeconds();
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
  var lockId = undefined;

  // Get the ID of the lock we are going to assign the new user to
  db.collection("users").find({user: req.smartlocksession.username}).toArray((err, result) => {
    lockId = result[0].lockId;
  })
  db.collection("users").find({user: username}).toArray((err, result) => {
    if(!result.length) {
      console.log("no username found");
      res.send({message: "No user found with this email"});
      return;
    }
    else if(result[0].lockId != null) {
      console.log("user already assigned");
      res.send({message:"User is already assigned to another lock"});
    }
    else {
      db.collection("users").update({user: result[0].user}, {$set: {lockId: lockId}});
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

app.post("/lock", (req, res) => {
  db.collection("users").find({user: req.smartlocksession.username}).toArray((err, result) => {
    var id = result[0].lockId;
    db.collection("locks").update({lockId: id}, {$set: {status: "locked"}}, (err, numberAffected, rawResponse) => {
      res.send();
    })
  })
})

// Proccesses the lock registration in the database
app.post("/registerLock", (req, res) => {
  var username = req.smartlocksession.username;

  // id gets sent as a string, so we must parse it as an integer
  var id = parseInt(req.body.id);
  db.collection("locks").find({lockId:  id}).toArray((err, result) => {

    if(result[0].owner == null) {

      // lock does not have an owner? Then set the username and the owner properly
      db.collection("locks").update({lockId: id}, {$set: {owner: req.smartlocksession.username}});
      db.collection("users").update({user: req.smartlocksession.username}, {$set: {lockId: id}});
      res.send({redirect: "/dashboard"});
    }
    else {
      // lock was already registered with someone so we send back a failure
      res.send({redirect: "failure"});
    }
  })
})

app.post("/unlock", (req, res) => {
  console.log("here");
  db.collection("users").find({user: req.smartlocksession.username}).toArray((err, result) => {
    var id = result[0].lockId;
    db.collection("locks").update({lockId: id}, {$set: {status: "unlocked"}}, (err, numberAffected, rawResponse) => {
      res.send();
    })
  })
})




