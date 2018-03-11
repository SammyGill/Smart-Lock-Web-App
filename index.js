/**
 * Some stuff to do: create a document for the owner inside the role collection
 *
 *
 *
 *
 */
 "use strict";
 const mongoClient = require("mongodb").MongoClient;
 let db = undefined;

 const async = require("async");

function searchLocks(lockId, locks) {
  for(let i = 0;  i < locks.length; i++) {
    if(locks[i].lockId == lockId) {
      return locks[i];
    }
  }

  // Returns false if the person doesn't have this lock in their collection
  return false;
}

// Checks to see if user is an owner of lock
function isOwner(username, lockId) {
  db.collection("users").find({"username": username, "locks.lockId": lockId}).toArray((err, result) => {
    let lock = searchLocks(lockId, result[0].locks);
    // returns false here if person isn't in lock
    if(!lock) {
      return false;
    }
    return lock.role == 0;
  })
}

// checks to see if person is admin of lock
function isAdmin(username, lockId) {
  db.collection("users").find({"username": username, "locks.lockId": lockId}).toArray((err, result) => {
    let lock = searchLocks(lockId, result[0].locks);
    // returns false here if person isn't in lock
    if(!lock) {
      return false;
    }
    return lock.role == 1;
  })
}

 exports.getLockInfo = function(lockId, username, callback) {
  let lockName = undefined;
  db.collection("locks").find({lockId: lockId}).toArray((err, result) => {
    lockName = result[0].lockName;
    username = username;
    callback({username: username, lockName: lockName});
  })
}

exports.connectServer = function() {
  mongoClient.connect("mongodb://ersp:abc123@ds044917.mlab.com:44917/smart-lock", (err, database) => {
    if(err) {
      return console.log(err);
    }

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
  let d = new Date();
  let minutes = d.getMinutes();
  let hours = d.getHours();
  if (d.getMinutes() < 10) {
   minutes = "0" + minutes;
 }
 if (d.getHours() > 12) {
   hours = hours % 12;
 }
 let date = hours + ":" + minutes
 if (d.getHours() < 12) {
  date = date + " AM";
} else {
  date = date + " PM";
}
return date;
}

exports.getTime = function() {
  let d = new Date();
  let minutes = d.getMinutes();
  let hours = d.getHours();
  if (d.getMinutes() < 10) {
   minutes = "0" + minutes;
 }
 if (d.getHours() > 12) {
   hours = hours % 12;
 }
 let date = hours + ":" + minutes
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
   let timeArray = time.split(":");
   timeArray[0] = parseInt(timeArray[0]);
   if(timeArray[0] != 12) {
    timeArray[0] += 12;
  }

  let timeString = parseInt(timeArray[0].toString() + timeArray[1]);
  return timeString;
}
time = time.replace("AM", "");
time = time.replace(" ", "");
let timeArray = time.split(":");
return (parseInt(timeArray[0] + timeArray[1]));
}

exports.checkRestrictions = function(inputArray, dbArray) {

  console.log(inputArray);
  let inputStart = inputArray[0];
  let inputEnd = inputArray[1];

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
  for(let i = 0; i < timesArray.length; i++) {
    if(currentTime > timesArray[i][0] && currentTime < timesArray[i][1]) {
      return false;
    }
  }

  return true;
}

exports.createRule = function(lockId, username, action, time) {
  let owner = undefined;
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
        db.collection("rules").insert({lockId: lockId, action: action, time: time});
      }
    })
  })


}

exports.getSettings = function(username, lockId, callback) {
      //Get the user's document who has this lock
  db.collection("users").find({"username": username, "locks.lockId": lockId}).toArray((err, result) => {
    //Loop through the locks array to find the information foe this lock
    let locksArray = result[0].locks;
    let settings = [];
    for (var i = 0; i < locksArray.length; i++) {
      if(locksArray[i].lockId == lockId) {
        let role = locksArray[i].role;
        //If the user is admin
        if(role == 0) {
          settings.push("Add Users");
          settings.push("Edit Admins");
          settings.push("Create Event");
        }
        else if(role == 1) {
          settings.push("Add Users");
          settings.push("Create Event");
        }
        else{
          settings.push("Create Event");
        }
        callback({setting: settings});
      }
    }
  })
}

exports.switchSettings = function(settingName, callback) {
  if(settingName == "Add Users") {
    callback("addMembers");
  }
  else if(settingName == "Edit Admins") {
    callback("editAdmins");
  }
  else if(settingName == "Create Event") {
    callback("addEvents");
  }
  else{
    console.log("Error in switcSettings!");
    callback("error");
  }
}

exports.createRole = function(action, username, lock, start, end, callback) {
        //convert to military time
        let restrictions = undefined;
        let timeArray = [start, end];
        let resultArray = undefined;
	//convert to military time

  db.collection("roles").find({username: username, lockId: lock}).toArray((err, result) => {
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
             callback(true);
             return true;
           }
           else {
                 // Otherwise there was an error in the input that was provided and we should
                 // give an appropriate error back
                 callback(false);
                 return false;
               }
             }
             else {
             }
           })
}


exports.getLockMembers = function(lockId, callback) {
  db.collection("locks").find({lockId: lockId}).toArray((err, result) => {
    let members = result[0].members;
    if(members.length == 0){
      members.push("There are no members currently associated with this lock");
    }
    callback(result[0].members);
  })
}

exports.getLocks = function(username, callback) {
  db.collection("users").find({username: username}).toArray((err, result) => {
    //console.log(result);
    var locks = result[0].locks;
    var lockIds = [];
    var lockNames = [];
    let locksArray = [];
    for(let i = 0; i < locks.length; i++) {
      locksArray.push(locks[i].lockId);
    }
    async.each(locksArray, function(file, callback) {
      db.collection("locks").find({lockId: file}).toArray((err, result) => {
        lockNames.push(result[0].lockName);
        lockIds.push(file);;
        callback();
      })
    }, function(err) {
      callback({locks: lockIds, lockNames: lockNames});
    })
  })
}

exports.lock = function(username, lockId, callback) {
  let lockTime = this.getTime();

  //check the lock restrictions
  db.collection("roles").find({username:  username, lockId: lockId}).toArray((err, result) => {
    if (result[0]) {
      let lockRestrictions = result[0].lockRestrictions;
    }
    //check if the user is the owner of the lock
    db.collection("locks").find({lockId: lockId}).toArray((err,result) => {
      let isOwner = (result[0].owner == username);

      if(isOwner || this.checkActionPermission(lockRestrictions, this.convertToMilitary(lockTime))) {
        let date = new Date();
        date = date.toDateString();
        let time = (date + " at " + lockTime);
        db.collection("history").find({lockId: lockId}).toArray((err, result) => {
          let names = result[0].usernames;
          let actions = result[0].actions;
          let times = result[0].times;
          names.push(username);
          actions.push("lock");
          times.push(time);
          db.collection("history").update({lockId: lockId}, {$set: {usernames: names, actions: actions, times:times}});

          db.collection("users").find({username: username}).toArray((err, result) => {
            db.collection("locks").update({lockId: lockId}, {$set: {status: "locked"}}, 
              (err, numberAffected, rawResponse) => {
                callback(true);
              })
          })
        })
      }
      else {
        callback(false);
      }
    })
  })
}

exports.getLockHistory = function(lockId, callback) {
  db.collection("history").find({lockId: lockId}).toArray((err, result) => {
    callback(result[0]);
  })
}

exports.addMember = function(username, lockId) {
   //find username(have to have existing account
   db.collection("users").find({username: username}).toArray((err,result) => {
      //if the length is not greater than 1
      if(!result.length){
         //display message 
         return false;
       }
       else{
         let locksArray = result[0].locks;
         let lockExists = false;
         //look for lock in the array
         for(let i=0; i< locksArray.length; i++){
            //if found update boolean
            if(locksArray[i] ==lockId){
             locksExists = true;
           }
         }
         if(lockExists==false){
            //if it doesn't alreafy exist for member then add 
            locksArray.push(lockId)
          }
         //update the users
         db.collection("users").update({username}, {$set: {locks: locksArray}});
         db.collection("locks").find({lockId: lockId}).toArray((err, result) =>{
            //use the passed in param for username
            let currentUser = username;
            console.log(currentUser);
            console.log(lockId);

            db.collection("roles").find({username: currentUser,lockId: lockId}).toArray((err,result2)=> {
             let members = result[0].members;
             username = username.toString();
             let alreadyExists = false;
             for(let i =0; i< members.length; i++){
              if(members[i]==username || result[0].owner == username){
               alreadyExists = true;
             }
           }
           if(alreadyExists == false && result2 != null && result2[0].canAddMembers == true) {
            members.push(username);
            db.collection("locks").update({lockId: lockId}, {$set: {membbers: members}}, (err, numberAffected, rawResponse) => {

              return true;
            });
          }
          else if (result2[0].canAddMembers == false) {
            return false;
          }else if (alreadyExists == true){
            return true;
          }
        })
          })
       }
     })
  }//end addMember 

  exports.unlock = function(username, lockId, callback) {
    var time = this.getTime();

    db.collection("roles").find({username: username, lockId: lockId}).toArray((err, result) => {
      if(result[0]) {
        let unlockRestrictions = result[0].unlockRestrictions;
      }

      db.collection("locks").find({lockId: lockId}).toArray((err, result) => {
        let owner = (result[0].owner == username);

    // If this returns true, then the user has permission to perform the actions
    if(owner || this.checkActionPermission(unlockRestrictions, this.convertToMilitary(time))) {
      let date = new Date();
      date = date.toDateString();
      time = (date + " at " + time);
      db.collection("history").find({lockId: lockId}).toArray((err, result) => {
        let names = result[0].usernames;
        let actions = result[0].actions;
        let times = result[0].times;
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

  exports.registerLock = function(lockId, lockName, userName, callback) {

    db.collection("users").find({"username": userName, "locks.lockId": lockId}).toArray((err, result) => {
      if(result.length > 0) {
      // There are people with this lock so it must have been registered
      console.log("in register lock: " + result[0].name);
    }
    else {
      // First person to try to register this lock
      console.log("could not find any locks");
      console.log(result);
    }
  })


    db.collection("locks").find({lockId: lockId}).toArray((err, result) => {
      if(result[0].owner == undefined) {

      // add the user to the lock
      db.collection("users").find({username: userName}).toArray((err, result) => {
        var locksArray = result[0].locks;
        var lockObject = {
          "lockId": lockId, 
          "role": 0, 
          "lockRestrictions": [[-1, -1]], 
          "unlockRestrictions": [[-1, -1]]
        };
        locksArray.push(lockObject);

        db.collection("users").update({username: userName}, {$set: {locks: locksArray}});
          // lock does not have an owner? Then set the username and the owner properly
          db.collection("locks").update({lockId: lockId}, {$set: {owner: userName, lockName: lockName, status: "locked"}});
          callback(true);
        })
    }
    else {
    // lock was already registered with someone so we send back a failure
    callback(false);
  }
})
  }

  exports.canAccess = function(username, lockId, callback) {
    //db.collection("locks").find({lockId: lockId}).toArray((err, result) => {
      //console.log("this is the result in index for locks "  + result[0].owner);
      //var owner = (username = result[0].owner);
      db.collection("roles").find({username: username, lockId: lockId}).toArray((err, result) => {
            //console.log("this is the result in index"  + result);
            callback(result[0]);
            /*if(owner || result[0].canCreateRules) {
                  res.send({access: true});
            }
            else {
                  res.send({access:false});
                }*/
              })
  //})
}

exports.getLockStatus = function(lockId, callback) {
  db.collection("locks").find({lockId: lockId}).toArray((err, result) => {
    callback({status: result[0].status});
  })
}

exports.authenticate = function(username, fullname,  callback) {
    /**
   * Determines whether or not the user has a lock associated through steps
   * - Attempt to see if the user is in the database with their email
   *    - If the resulting array != 0, then we found a user in the database
   *      - If the lock id associated is null, then the user needs to register their lock
   *      - Else the user has a lock associated and we can send them to the dashboard
   *    - Else the resulting array size == 0, then we must first add the user to the
   *      database before redirecting them to register their lock
   */
   db.collection("users").find({username: username}).toArray((err, result) => {
   //If the user exists, redirect the user according to the number of locks he has
   if(result.length) {
     if(result[0].locks.length == 0) {
       callback({locks: []}, undefined);
     }
     else if(result[0].locks.length == 1) {
      callback({locks: result[0].locks}, result[0].locks[0].lockId);
    }
    else {
     callback({locks: result[0].locks}, undefined)
   }
 }
  //If the user does not exist, create a document for the user in the database and redirect him to register page
  else {
   db.collection("users").insert({username: username, name: fullname, locks: [], }, (err, doc) => {
     callback({locks:[]});})
 }
})
 }

exports.getDashboardInformation = function(username, lockId, callback) {
  db.collection("locks").find({lockId: lockId}).toArray((err, result) => {
    let lockName = result[0].lockName;
    callback({username: username, lockName: lockName});
  })
}

