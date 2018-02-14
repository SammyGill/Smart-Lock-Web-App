var mongoClient = require("mongodb").MongoClient;
var db = undefined;


exports.connectServer = function() {
    mongoClient.connect("mongodb://ersp:abc123@ds044917.mlab.com:44917/smart-lock", (err, database) => {
        if(err) {
        return console.log(err);
        }
  
        console.log("hello");
        module.exports.db =  database.db("smart-lock");
        db = database.db("smart-lock");
   })
}

exports.findUser = function(user) {
    db.collection("users").find({username: user}).toArray((err, result) => {
        if(result[0]) {
            console.log("found a user!!!");
        }
        else {
            console.log("did not find a user!");
        }
    })
}

exports.isLoggedIn = function(user) {
    return((user != undefined));
 },
 
 
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
     if (d.getHours() < 12) {
        date = date + " AM";
     } else {
        date = date + " PM";
     }
  return date;
}

exports.getTime = function() {
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
       if (d.getHours() < 12) {
          date = date + " AM";
       } else {
          date = date + " PM";
       }
    return date;
 };
 
exports.convertToMilitary = function(time) {
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
 
checkRestrictions = function(inputArray, dbArray) {

  console.log(inputArray);
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
 
exports.checkActionPermission = function(timesArray, currentTime) {
  for(var i = 0; i < timesArray.length; i++) {
    if(currentTime > timesArray[i][0] && currentTime < timesArray[i][1]) {
      return false;
    }
  }

       return true;
 }

exports.createRule = function(lockId, username, action, time) {
  var owner = undefined;
  db.collection("locks").find({lockId: lockId}).toArray((err, result) => {
    owner = (result[0].owner == username);
    db.collection("roles").find({username: username, lockId: lockId}).toArray((err, result2) => {
      if(!owner) {
        if (result2[0].canCreateRules == false) {
          res.send({message: "You can't create rules!"});
        } 
        else {
          db.collection("rules").insert({lockId: lockId, action: action, time: time});
        }
      }
      else {
        console.log("created");
          db.collection("rules").insert({lockId: lockId, action: action, time: time});
        }
      })
  })


}

exports.createRole = function(action, username, lock, start, end, callback) {
        //convert to military time
        var restrictions = undefined;
        var timeArray = [start, end];
        var resultArray = undefined;
        db.collection("roles").find({username: username, lockId: lock}).toArray((err, result) => {
              // If we found a user with the roles, check to see if there are any conflicts
              console.log(username);
              console.log(lock);
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
              if(action == "lock") {
              resultArray = result[0].lockRestrictions;
  
              resultArray.push(timeArray);
              db.collection("roles").update({username: username, lockId: lock}, {$set:{lockRestrictions: resultArray}});
              }
              else {
                 resultArray = result[0].unlockRestrictions;
                 resultArray.push(timeArray);
                 db.collection("roles").update({username: username, lockId: lock}, {$set:{unlockRestrictions: resultArray}});
              } 
                console.log("returning true");
                callback(true);
                return true;
              }
              else {
                 // Otherwise there was an error in the input that was provided and we should
                 // give an appropriate error back
                 console.log("returning false");
                 callback(false);
                 return false;
              }
              }
              else {
                  console.log("hello222");
              }
        })
 }


exports.getLockMembers = function(lockId, callback) {
  db.collection("locks").find({lockId: lockId}).toArray((err, result) => {
    var members = result[0].members;
    if(members.length == 0){
      members.push("There are no members currently associated with this lock");
    }
    callback(result[0].members);
  })
}


exports.getLocks = function(lockId, callback) {
  db.collection("locks").find({lockId: lockId}).toArray((err, result) => {
    callback(result[0]);
  })
}

//module.exports.createRule = createRule;
exports.getLockHistory = function(lockId, callback) {
  db.collection("history").find({lockId: lockId}).toArray((err, result) => {
    callback(result[0]);
  })
}

exports.unlock = function(username, lockId, callback) {
  var time = this.getTime();

  db.collection("roles").find({username: username, lockId: lockId}).toArray((err, result) => {
    if(result[0]) {
      var unlockRestrictions = result[0].unlockRestrictions;
    }
    
  db.collection("locks").find({lockId: lockId}).toArray((err, result) => {
    var owner = (result[0].owner == username);
                 
    // If this returns true, then the user has permission to perform the actions
    if(owner || this.checkActionPermission(unlockRestrictions, this.convertToMilitary(time))) {
      var date = new Date();
      date = date.toDateString();
      time = (date + " at " + time);
      db.collection("history").find({lockId: lockId}).toArray((err, result) => {
        var names = result[0].usernames;
        var actions = result[0].actions;
        var times = result[0].times;
        names.push(username);
        actions.push("unlock");
        times.push(time);
        db.collection("history").update({lockId: lockId}, {$set: {usernames: names, actions: actions, times:times}});
      })
      db.collection("users").find({username: username}).toArray((err, result) => {
        db.collection("locks").update({lockId: lockId}, {$set: {status: "unlocked"}}, (err, numberAffected, rawResponse) => {
          callback(true);
        })
      })
    }
    else {
      // Send them an error message saying they do not have permission 
      callback(false);
    }
  })
  // We were able to find a role associated with this lock and user
  })
}

exports.registerLock = function(username, lockId, lockName, callback) {

db.collection("locks").find({lockId:  lockId}).toArray((err, result) => {
    if(result[0].owner == null) {
    db.collection("users").find({username: username}).toArray((err, result) => {
          var idArray = result[0].locks
          idArray.push(lockId);
          // lock does not have an owner? Then set the username and the owner properly
          db.collection("locks").update({lockId: lockId}, {$set: {owner: username}});
          db.collection("users").update({username: username}, {$set: {locks: idArray}});
          db.collection("locks").update({lockId: id}, {$set: {lockName: lockName}});
          callback(true);
          })
    }
    else {
    // lock was already registered with someone so we send back a failure
    callback(false);
    }
  })
}
