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
       if(currentTime > timesArray[0][0] && currentTime < timesArray[0][1]) {
             return false;
       }
       return true;
 }

function createRole(action, username, lock, start, end, callback) {
    console.log("inside function");
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

 module.exports.createRole = createRole;
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

exports.getLockHistory = function(lockId, callback) {
  db.collection("history").find({lockId: lockId}).toArray((err, result) => {
    callback(result[0]);
  })
}
