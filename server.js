var express = require("express");
var mongoClient = require("mongodb").MongoClient;
var db = undefined;
var app = express();
var dir = __dirname;
var bodyParser = require('body-parser');
var session = require("client-sessions");

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


// Route for accessing the site
app.get("/", (req, res) => {
  res.sendFile(dir + "/views/index.html");
})


// Route for authenticating users after they log in via Google
app.get("/authenticate", (req, res) => {
  var email = req.query.email;
  var req = req;
  db.collection("users").find({user: email}).toArray((err, result) => {
    req.smartlocksession.username = email;
    if(result.length) {
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


// Route that redirects users to their lock dashboard
app.get("/dashboard", (req, res) => {
  res.sendFile(dir + "/views/dashboard.html");
})


// Route that redirects users to register their lock
app.get("/register", (req, res) => {
  res.sendFile(dir + "/views/register.html");
})


app.get("/dashboardInformation", (req, res) => {
  res.send(req.smartlocksession.username);
})

// Proccesses the lock registration in the database
app.post("/registerLock", (req, res) => {
  var username = req.smartlocksession.username;
  var id = parseInt(req.body.id);
  db.collection("locks").find({lockid:  id}).toArray((err, result) => {
    if(result[0].owner == null) {
      db.collection("locks").update({lockid: id}, {$set: {owner: req.smartlocksession.username}});
      db.collection("users").update({user: req.smartlocksession.username}, {$set: {lockId: id}});
      res.send({redirect: "/dashboard"});
    }
    else {
      res.send({redirect: false});
    }
  })
})
