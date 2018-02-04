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



//check if user is logged in 
function isLoggedIn(user) {
   return((user != undefined));
}

//get the time
function getTime() {
   //create new date
   var d = new Date();
   //get mins + hours
   var minutes = d.getMinutes();
   var hours = d.getHours();
   //format
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

//convert civilian to military time 
function convertToMilitary(time) {
   if(time.indexOf("PM") != -1) {
      time = time.replace("PM", "");
      time = time.replace(" ", "");
      var timeArray = time.split(":");
      timeArray[0] = parseInt(timeArray[0]);
      if(timeArray[0] != 12) {
         timeArray[0] += 12;
      }

      var timeString = parseInt(timeArray[0].toString() + timeArray[1]);
      return timeString;
   }
   time = time.replace("AM", "");
   time = time.replace(" ", "");
   var timeArray = time.split(":");
   return (parseInt(timeArray[0] + timeArray[1]));
}

function checkRestrictions(inputArray, dbArray) {
   var inputStart = inputArray[0];
   var inputEnd = inputArray[1];
   for(var i = 0; i < dbArray.length; dbArray++) {
      if(inputStart < dbArray[i][1] && inputStart > dbArray[i][0]) {
         return false;
      }
      if(inputEnd < dbArray[i][1] && inputEnd > dbArray[i][0]) {
         return false;
      }
   }
   return true;
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
         namesArray = [];
         actionsArray = [];
         timesArray = [];
         memberArray = [];
         for(var i = 0; i < 50; i++) {
         db.collection("locks").insert({lockId: i, lockName: null, owner: null, status:"locked", members: memberArray});
         db.collection("history").insert({lockId: i, names: namesArray, actions: actionsArray, times: timesArray});
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
      res.sendFile(dir + "/views/register.html");
      })
// Route for authenticating users after they log in via Google
// Determines whether or not the user has a lock associated with them
app.get("/authenticate", (req, res) => {
      // User email is obtained from the Javascript function after user has logged
      // in viga Google
      var email = req.query.email;
      var fullname = req.query.email;
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
  // Determines whether or not the user has a lock associated with them
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
      var username = undefined;
      db.collection("locks").find({lockId: req.session.lock}).toArray((err, result) => {
            lockName = result[0].lockName;
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
      var members = [];
      var fullnames = [];

      db.collection("locks").find({lockId: id}).toArray((err, result) => {
            members = result[0].members;
            if(members.length == 0){
            members.push("There are no members currently associated with this lock");
            }
            res.send({members: members, owner: result[0].owner});
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
      db.collection("locks").find({lockId: lockId}).toArray((err, result) => {
            })

      res.sendFile(dir + "/views/settings.html");
      })


app.get("/switchLock", (req, res) => {
      req.session.lock = parseInt(req.query.lockId);
      res.send();
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


app.get("/canAccessAddMembers", (req, res) => {
      var username = req.session.username;
      var lockId = req.session.lock;
      db.collection("roles").find({username: username, lockId: lockId}).toArray((err, result) => {
            res.send({roles: result[0]});
            //}
            })
      })

app.get("/canAccess", (req, res) => {
  var username = req.session.username;
  var lockId = req.session.lock;
  db.collection("roles").find({username: username, lockId: lockId}).toArray((err, result) => {
     res.send({roles: result[0]});
   //}
 })
})

app.get("/showHistory", (req, res) => {
  var id = req.session.lock;
  var members = [];
  var memActions = [];
  var userActing = [];

  db.collection("history").find({lockId: id}).toArray((err, result) => {
    members = result[0].times;
    memActions = result[0].actions;
    //userActing = result[0].usernames;
    members.push(result[0].owner);
    memActions.push(result[0].owner);
    //userActing.push(result[0].owner);
    res.send({members: members, memActions: memActions/*, userActing: userActing*/});
  })
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
      var lockId = req.session.lock
      //find username(had to have account already)
      db.collection("users").find({username: username}).toArray((err, result) => {
            //if the length is not greater than 1
            if(!result.length) {
            //display message 
            res.send({message: "No user found with this email"});
            return;
            }
            else {
            var locksArray = result[0].locks;
            var lockExists = false;
            //look for lock in the array
            for (var i = 0; i < locksArray.length; i++) {
            if (locksArray[i] == lockId) {
            lockExists = true;
            }
            }
            if (lockExists == false) {
            locksArray.push(lockId);
            }
            //update the users 
            db.collection("users").update({username: username}, {$set: {locks: locksArray}});
            db.collection("locks").find({lockId: lockId}).toArray((err, result) => {
                  var members = result[0].members;
                  username = username.toString();
                  var alreadyExists = false;
                  for (var i = 0; i < members.length; i++) {
                  if (members[i] == username || result[0].owner == username) {
                  alreadyExists = true;
                  }
                  }
                  if (alreadyExists == false) {
                  members.push(username);
                  db.collection("locks").update({lockId: lockId}, {$set: {members: members}}, (err, numberAffected, rawResponse) => {
                        res.send({message: "User successfully assigned to lock"});
                        });
                  } else {
                  res.send({message: "User already exists for this lock!"});
                  }
                  })
            }
      })
})

//add time restrictions to when lock will be locked/unlocked
app.post("/addTimeRestriction", (req, res) => {
      //convert to military time
      var startTime = convertToMilitary(req.body.startTime);
      var endTime = convertToMilitary(req.body.endTime);
      var action = req.body.action;
      var restrictions = undefined;
      var timeArray = [startTime, endTime];
      var username = req.body.username;
      var resultArray = undefined;
      db.collection("roles").find({username: username, lockId: req.session.lock}).toArray((err, result) => {
            // If we found a user with the roles, check to see if there are any conflicts
            if(result[0]) {
            // check to see if there are any conflicts
            if(action == "lock") {
            restrictions = result[0].lockRestrictions;
            }
            else {
            restrictions = result[0].unlockRestrictions;
            }

            // function to determine if there is an overlap in the lockRestrictions
            if(checkRestrictions(timeArray, restrictions)) {
            // If result is true, there is no error in the input and we can go ahead and add it
            if(req.body.action == "lock") {
            resultArray = result[0].lockRestrictions;

            resultArray.push(timeArray);
            db.collection("roles").update({username: username, lockId: req.session.lock}, {$set:{lockRestrictions: resultArray}});
            }
            else {
               resultArray = result[0].unlockRestrictions;
               resultArray.push(timeArray);
               db.collection("roles").update({username: username, lockId: req.session.lock}, {$set:{unlockRestrictions: resultArray}});
            }
            res.send();
            }
            else {
               // Otherwise there was an error in the input that was provided and we should
               // give an appropriate error back
               res.send({error: "There is an error with your input!"});
            }
            }
      })
})

app.post("/createRole", (req, res) => {
      console.log(req.body.timeOne);
      console.log(req.body.timeTwo);
      console.log(convertToMilitary(req.body.timeOne));
      console.log(convertToMilitary(req.body.timeTwo));
      console.log("create role");
      })

//rule for lock
app.post("/createRule", (req, res) => {
      var lockId = req.session.lock;
      db.collection("rules").insert({lockId: lockId, action: req.body.action, time: req.body.time});
      })

//lock function
app.post("/lock", (req, res) => {
	var username = req.session.username;
	var time = getTime();
	var date = new Date();
	date = date.toDateString();
	time = (date + " at " + time);
	db.collection("history").find({lockId: req.session.lock}).toArray((err, result) => {
		var names = result[0].usernames;
		var actions = result[0].actions;
		var times = result[0].times;
		names.push(username);
		actions.push("lock");
		times.push(time);
		db.collection("history").update({lockId: req.session.lock}, {$set: {usernames: names, actions: actions, times:times}});
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


      //look for user name
      db.collection("users").find({username: username}).toArray((err, result) => {
            //update locks array by adding new id 
            db.collection("locks").update( {$set: {lockId: id}}, (err, numberAffected, rawResponse) => {
                  res.send();
                  })
            //add the lockname to the lockname array in the data base
            db.collection("locks").update({$set: {lockName: req.body.lockName}},( err, numberAffected, rawResponse) => {
                  res.send();
                  })
            })
      db.collection("locks").find({lockId:  id}).toArray((err, result) => {
            if(result[0].owner == null) {
            db.collection("users").find({username: req.session.username}).toArray((err, result) => {
                  var idArray = result[0].locks
                  idArray.push(id);
                  req.session.lock = parseInt(id);
                  // lock does not have an owner? Then set the username and the owner properly
                  db.collection("locks").update({lockId: id}, {$set: {owner: req.session.username}});
                  db.collection("users").update({username: req.session.username}, {$set: {locks: idArray}});
                  db.collection("locks").update({lockId: id}, {$set: {lockName: req.body.lockName}});
                  res.send({redirect: "/dashboard"});
                  })
            }
            else {
            // lock was already registered with someone so we send back a failure
            res.send({redirect: "failure"});
            }
            })


	var username = req.session.username;

  // id gets sent as a string, so we must parse it as an integer
	var id = parseInt(req.body.id);
	
  db.collection("locks").find({lockId:  id}).toArray((err, result) => {
    if(result[0].owner == null) {
      db.collection("users").find({username: username}).toArray((err, result) => {
			var idArray = result[0].locks
			idArray.push(id);
			req.session.lock = parseInt(id);
			// lock does not have an owner? Then set the username and the owner properly
			db.collection("locks").update({lockId: id}, {$set: {owner: username}});
			db.collection("users").update({username: username}, {$set: {locks: idArray}});
			db.collection("locks").update({lockId: id}, {$set: {lockName: req.body.lockName}});
			res.send({redirect: "/dashboard"});
	  })
    }
    else {
      // lock was already registered with someone so we send back a failure
      res.send({redirect: "failure"});
    }
  })
})

//unlock function
app.post("/unlock", (req, res) => {
	var username = req.session.username;
	var time = getTime();
	var date = new Date();
	date = date.toDateString();
	time = (date + " at " + time);
	db.collection("history").find({lockId: req.session.lock}).toArray((err, result) => {
		var names = result[0].usernames;
		var actions = result[0].actions;
		var times = result[0].times;
		names.push(username);
		actions.push("unlock");
		times.push(time);
		db.collection("history").update({lockId: req.session.lock}, {$set: {usernames: names, actions: actions, times:times}});
	})
	db.collection("users").find({username: username}).toArray((err, result) => {
		var id = req.session.lock;
		db.collection("locks").update({lockId: id}, {$set: {status: "unlocked"}}, (err, numberAffected, rawResponse) => {
			res.send();
		})
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
