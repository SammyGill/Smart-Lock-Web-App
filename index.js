/**
 * Some stuff to do: create a document for the owner inside the role collection
 */
 "use strict";
 const mongoClient = require("mongodb").MongoClient;
 let db = undefined;

 const async = require("async");
 const assert = require("assert")
 const schedule = require('node-schedule');


  /**
   * Scheduled check that will occur every minute. Checks the events database and gets all locks with an action at
   * that current time and performs the actions after checking if the user who submitted the 
   * request is allowed to perform the action at that certain time.
   */
   const j = schedule.scheduleJob('*/1 * * * *', function(){
    console.log('Cheese is great!');
    let d = new Date();
  //convert the time accordingly in order to look it up in the database
  let timeInMilitary = "" + convertToMilitary(d.getHours() + ":" + d.getMinutes());
  //look up all events at that specified time
  db.collection("events").find({"time": timeInMilitary}).toArray((err, result) => {
    //for each of those locks, perform the appropriate actions (either lock or unlock)
    for (let i = 0; i < result.length; i++) {
      //if the action was to lock
      if (result[i].action == "lock") {
        console.log("The lock was automatically locked!");
        //get the user object based on the username
        getUser(result[i].username, function(user) {
          //check if the user has the permissions to lock
          if(canLock(user, result[i].lockId)) {
            //update the lock's status in the locks database
            db.collection("locks").update({lockId: result[i].lockId}, {$set: {status: "locked"}}, (err, numberAffected, rawResponse) => {
              if(!err) {
                //add to history
                addToHistory(result[i].username, result[i].lockId, "lock");
              }
            })
          }
        })
      //if the action was to unlock
    } else {
      console.log("The lock was automatically unlocked!");
        //get the user object based on the username
        getUser(result[i].username, function(user) {
          //checks if the user can actually unlock the lock
          if(canUnlock(user, result[i].lockId)) {
            //updates the lock's status to unlock in the lock database
            db.collection("locks").update({lockId: result[i].lockId}, {$set: {status: "unlocked"}}, (err, numberAffected, rawResponse) => {
              if(!err) {
                //add to history
                addToHistory(result[i].username, result[i].lockId, "unlock");
              }
            })
          }
        })
      }
    }
  })

});

/**
 * Searches through an array of locks and determines whether a particular
 * lock ID is contained in the array
 * 
 * @param {int} lockId - id of the lock we are looking for
 * @param {array of locks} locks - lock objects that belong to the user
 */
 function searchLocks(lockId, locks) {
  for(let i = 0;  i < locks.length; i++) {
    if(locks[i].lockId == lockId) {
      return locks[i].role;
    }
  }
}

/**
 * Searches for the user's document in the databse with the given 
 * username. The user's email is passed in and the userObject will be returned
 * 
 * @param {string} username - username of the user we are looking for
 * @param callback - the call back function
 */
 function getUser(username, callback) {
  db.collection("users").find({"username": username}).toArray((err, result) => {
    callback(result[0]);
  })
}

/**
 * Add a new user to the given lock
 * 
 * @param userObject - the document for that user in the database
 * @param {int} lockId - the id of the lock that the new user will be added to
 *
 * Note: When we are adding a new user using this function, we are adding him 
 * as a member. We also update the member list for that lock.
 */
 function addUserToLock(userObject, lockId) {
  let newLock = {
    "lockId": lockId,
    "role": 2,
    "lockRestrictions": [],
    "unlockRestrictions": []
  };
  userObject.locks.push(newLock);
  db.collection("users").update({username: userObject.username}, {$set:{locks: userObject.locks}});
  db.collection("locks").find({lockId: lockId}).toArray((err, result) => {
    let lock = result[0];
    lock.members.push(userObject.username);
    db.collection("locks").update({lockId: lockId}, {$set: {members: lock.members}});
  })

}

/**
 * check if the lock contains a certain member
 * 
 * @param {string} username - the username to be serached
 * @param {int} lockId - the id of the lock whose member we are searching through
 */
 function lockContainsMember(username, lockId, callback) {
  db.collection("locks").find({lockId: lockId}).toArray((err, result) => {
    let membersArray = result[0].members;
    for(let i = 0; i < membersArray.length; i++) {
      if(username == membersArray[i]) {
        callback(true);
        return;
      }
    }
    callback(false);
    return;
  })
}

/**
 * Determines whether a particular user is an owner of a lock. We query the user's 
 * locks to see if it contains that particular lock and then check the user's role 
 * under that lock.
 * 
 * @param {string} username - username for a particular user we are querying for
 * @param {int} lockId - ID of the lock we are looking for 
 */
 function isOwner(userObject, lockId) {
  console.log("LOCK ID IS " + lockId);
  let role = searchLocks(lockId, userObject.locks);
    // returns false here if person isn't in lock
    if(role == undefined) {
      return false;
    }
    return (role == 0);
 
}


/**
 * Determines whether a particular user is an admin of a lock. We query the user's
 * locks to see if it contains that particular lock and then check the user's role
 * under that lock.
 * 
 * @param {string} username - username for a particular user we are querying for
 * @param {int} lockId - ID of the lock we are looking at
 * @return true or false
 */
 function isAdmin(userObject, lockId) {
  let role = searchLocks(lockId, userObject.locks);
    // returns false here if person isn't in lock
    if(role == undefined) {
      return false;
    }
    return (role == 1);
  
}



/**
 * Looks through array and determines if user is member
 * @param: username, lockId
 * @return: true or false
 */
 function isMember(username, lockId) {
   db.collection("users").find({"username": username, "locks.lockId": lockId}).toArray((err,result) => {
    let lock= searchLocks(lockId, result[0].locks);
      //return false here if person isn't in lock
      if(!lock){
       return false;
     }
     return lock.role ==2;
   })
 }

/**
 * check if a member is able to make certain action according to the restriction
 * @param userObject - the document of that user from the database
 * @param {int} lockId - the lockId of the lock to be locked/unlocked
 * @param {string} action - lock or unlock
 * @return: true if the user is allowed to make this action
 * false if the user is not allowed to make this action
 */
 function withinBounds(userObject, lockId, action) {
  let lock = searchLocks(lockId, userObject);
    // returns false here if person isn't in lock
    if(!lock) {
      return false; }
      let currentTime = convertToMilitary(getTime());
      if (action == "lock") {
        for(let i = 0; i < lock.lockRestrictions.length; i++) {
          if (lock.lockRestrictions[i][0] < currentTime && lock.lockRestrictions[i][1] > currentTime) {
            return false;
          }
        }
      } else {
        for(let i = 0; i < lock.unlockRestrictions.length; i++) {
          if (lock.unlockRestrictions[i][0] < currentTime && lock.unlockRestrictions[i][1] > currentTime) {
            return false;
          }
        }
      }
      return true;
    }

  /**
   * Determines where a user can perform the lock action at the particular time.
   * A user can lock if:
   *  1.) They are an owner of the lock
   *  2.) They are an admin of the lock
   *  3.) They are a member of the lock and do not conflict with any restrictions
   * 
   * @param {string} username - username of the user we are querying for
   * @param {int} lockId - ID of the lock in question
   */
   function canLock(user, lockId) {
    return (isOwner(user, lockId) || isAdmin(user, lockId) || withinBounds(user, lockId, "lock"));
  }

  /**
   * Determines where a user can perform the unlock action at the particular time.
   * A user can lock if:
   *  1.) They are an owner of the lock
   *  2.) They are an admin of the lock
   *  3.) They are a member of the lock and do not conflict with any restrictions
   * 
   * @param {string} username - username of the user we are querying for
   * @param {int} lockId - ID of the lock in question
   */
   function canUnlock(user, lockId) {
    return (isOwner(user, lockId) || isAdmin(user, lockId) || withinBounds(user, lockId, "unlock"));
  //return (isOwner(username, lockId) || isAdmin(username, lockId) || withinBounds(username, lockId, "unlock"));
}

  /**
   * Determines where a user can add member
   * A user can add member if:
   *  1.) They are an owner of the lock
   *  2.) They are an admin of the lock
   * 
   * @param {string} user - username of the user we are querying for
   * @param {int} lockId - ID of the lock in question
   */
   function canAddMembers(user, lockId) {
    return (isOwner(user, lockId) || isAdmin(user, lockId));
  }

  /**
   * Determines whether a user is allowed to create a lock event. A user
   * can create a lock event at a specified time if they are able to
   * lock at that time.
   * 
   * @param {string} username - username of the user we are querying for
   * @param {int} lockId - ID of the lock we are checking 
   */
   function canCreateLockEvent(username, lockId) {
    return canLock(username, lockId);
  }

/**
 * Determines whether a user is allowed to create an ulock event or not.
 * A User can create an unlock event at a specified time if they are able
 * to unlock at that time.
 * 
 * @param {string} username - user of the user we are querying for
 * @param {int} lockId ID of the lock we are checking
 */
 function canCreateUnlockEvent(username, lockId) {
  return canUnlock(username, lockId);
}

/**
 * Given a lockId, returns the name of the lock
 * 
 * @param {int} lockId - ID of the lock we are getting information for
 * @param {string} username - I THINK WE CAN DELETE THIS?
 * @param {function} callback - callback function takine gusername and lock name
 */
 exports.getLockInfo = function(lockId, username, callback) {
  let lockName = undefined;
  db.collection("locks").find({lockId: lockId}).toArray((err, result) => {
    lockName = result[0].lockName;
    username = username;
    callback({username: username, lockName: lockName});
  })
}

/**
 * Function to connect to the server
 */
 exports.connectServer = function() {
  mongoClient.connect("mongodb://ersp:abc123@ds044917.mlab.com:44917/smart-lock", (err, database) => {
    if(err) {
      return console.log(err);
    }

    module.exports.db =  database.db("smart-lock");
    db = database.db("smart-lock");
  })
}

/**
 * Determines whether a user is logged in or not
 * 
 * @param {string} user - the username of the user that we want to check
 */
 exports.isLoggedIn = function(user) {
  return((user != undefined));
};


/**
 * Returns current time
 */
 var getTime = function() {
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
  } 
  else {
    date = date + " PM";
  }
  return date;
};

/**
 * Convert the current time into military time
 */
 var convertToMilitary = function(time) {
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
if (timeArray[1] < 10) {
  timeArray[1] = "0" + timeArray[1];
}
if (timeArray[0] < 12) {
  return ("0" + parseInt(timeArray[0] + timeArray[1]));
}
return (parseInt(timeArray[0] + timeArray[1]));
};


/**
 * When a user is adding a new time restriction, we use this function to check 
 * if the restriction is a valid one
 * 
 * @param {array} inputArray - the time restrictions that the user enter
 * @param {array} bdArray - the time restrictions that the lock originally have
 */
 exports.checkRestrictions = function(inputArray, dbArray) {

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

// *
//  * When a user is adding a new time restriction, we use this function to check 
//  * if the restriction is a valid one
//  * 
//  * @param {array} inputArray - the time restrictions that the user enter
//  * @param {array} bdArray - the time restrictions that the lock originally have

// exports.checkActionPermission = function(timesArray, currentTime) {
//   for(let i = 0; i < timesArray.length; i++) {
//     if(currentTime > timesArray[i][0] && currentTime < timesArray[i][1]) {
//       return false;
//     }
//   }

//   return true;
// }


  /**
   * User A can create event E for lock L for time T
   *    - if owner(L) or admin(L) or (member(L) and withinBounds(t))
   *
   * @param lockId - the lockId of te lock that will execute the event
   * @param username - the username of the user who is adding this event
   * @param action - the action to make, which is either "lock" or "unlock"
   * @param time - the time that the event is planned to be preformed
   *
   * NOTE:
   *    - THIS IS SEPARATE FROM THE EVENT ACTUALLY FIRING EVEN THOUGH
   *       THE CHECKS TO SEE IF IT IS ALLOWED TO FIRE WILL BE THE SAME
   *    - We store the user who created the event along with
   *      all of the other event information just to make sure that user 
   *      is even allowed to perform that action at that time
   */
   exports.createEvent = function(lockId, username, action, time, callback) {
     getUser(username, function(user) {
      if(isOwner(user, lockId) || isAdmin(user, lockId)) {
      // Check to see if such an event already exists
      time = "" + convertToMilitary(time);
      db.collection("events").find({"lockId": lockId, "time": time}).toArray((err, result) => {
        if(result.length != 0) {
          callback({message:"An event already exists for this lock at this time!"});
          return;
        }
        let eventObject = {
          username: username,
          lockId: lockId,
          action: action,
          time: time
        };
        db.collection("events").insert(eventObject);
        callback({message: "Event created successfully!"});
      })
    }
  })
   }

  /**
   * Display the settings for different user
   * If user A is owner(L), A is able to addRemoveUser/editAdmin/createEvent
   * If user A is Admin(L), A is able to addRemoveUser/createEvent
   * If user A is member(L), A is able to creteEvent
   *
   * @param lockId - the lockId of the lock that we are looking
   * @param username - the username of the user that we are looking
   */
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
          settings.push("Add/Remove Users");
          settings.push("Edit Users");
          settings.push("Create Event");
        }
        else if(role == 1) {
          settings.push("Add/Remove Users");
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

/**
   * Switch between setting tabs
   *
   * @param {string} settingName - the name of the setting to be switched to
   *
   */
   exports.switchSettings = function(settingName, callback) {
    if(settingName == "Add/Remove Users") {
      callback("addMembers");
    }
    else if(settingName == "Edit Users") {
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

  /**
   * Function to get the specific lock of the specific user
   *
   * @param lockId - the lockId of the lock that we are looking for 
   * @param username - the username of the user we are looking for the lock
   */
   function getLockOfUser(username, lockId) {
    db.collection("users").find({"username": username, "locks.lockId": lockId}).toArray((err,result) => {
      for(let i = 0;  i < result[0].locks.length; i++) {
        if(result[0].locks[i].lockId == lockId) {
          return result[0].locks[i];
        }
      }
      return undefined;
    })
  }

  /**
  * Creates role for user and adds associated restrictions
  *
  * Given user M who called the request
  * upon user M', lock L, action A, start time s, end time e
  *  
  * M should be able to create a restriction for M' iff
  *    - ( isOwner(M, L) or isAdmin (M, L) ) and ( !isOwner(M', L) and !isAdmin(M', L) )
  *    - start and end create a valid timeframe for an unlock 
  *
  * @param action - the action that we want to add restrictions to 
  * @param username - the username of the user who is calling this function. 
  *       He should either be an owner or an admin of this lock
  * @param userToChange - the username of the user whose role will be modified.
  *       He should be a member of this lock
  * @param lockId - the lockId of the lock that is associted
  * @param start - the starting time of the restriction
  * @param end - the end time of the restriction
  *
  * @return: true if role was created else false
  *
  *
  * NOTES: 
  *    - the times may need to be converted to military if they already aren't
  *    - we'll need to check if it is an unlock or lock restriction
  *    - use the callback to return the success/failure
  */
  exports.createRole = function(username, action, userToChange, lockId, start, end, callback) {
    getUser(username, function(user) {
      getUser(userToChange, function(result) {
        if(  (isOwner(user, lockId) || isAdmin(user, lockId))  &&  (!(isOwner(result, lockId)) && !(isAdmin(result, lockId)))  ) {
          let timeArray = [start, end];
          //get lock of userToChange based on action(lock/unlock) array
          let lockToChange = getLockOfUser(userToChange, lockId);
          //choose between lock and unlock array
          let arrayToAddRestriction;
          if (action == "lock") {
            arrayToAddRestriction = lockToChange.lockRestrictions;
          } else if (action == "unlock"){
            arrayToAddRestriction = lockToChange.unlockRestrictions;
          }
          else{
            callback(false);
          }
          //call check restrictions if the change can occur
          if (checkRestrictions(timeArray, arrayToAddRestriction)) {
            console.log("adding this time restriction" + timeArray[0] + " until " + timeArray[1] + " for user " + userToChange);
            arrayToAddRestriction.push(timeArray);
          }
          else{
            callback(false);
          }
        }
        else{
          callback(false);
        }
      })
    })
  }

/**
 * Gets the members of a specific lock
 * @param lockId - the lock Id of the lock that we are looking at
 * @return array of members or message saying there are no members
 */
 exports.getLockMembers = function(lockId, callback) {
  db.collection("locks").find({lockId: lockId}).toArray((err, result) => {
    let members = result[0].members;
    if(members.length == 0){
      members.push("There are no members currently associated with this lock");
    }
    callback(result[0].members);
  })
}


exports.getLockAdmins = function(lockId, callback) {
  db.collection("locks").find({lockId: lockId}).toArray((err, result) => {
    let allMembers = result[0].members;
    console.log(allMembers);
    let adminArray = [];
    for (let i = 0; i < allMembers.length; i++) {
      getUser(allMembers[i], function(user) {
        if (isAdmin(user, lockId)) {
          adminArray.push(allMembers[i]);
        }
      })
    }
    callback(adminArray);
  })
}

/**
 * Get the list of locks of the specific user
 * @param: username, callback
 * @return: locknames
 */
 exports.getLocks = function(username, callback) {
  db.collection("users").find({username: username}).toArray((err, result) => {

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

/**
 * Locks the lock, checks lock restrictions, adds action to 
 * history
 * @param: username, lockId, callback
 * @return:true if locked, else false
 */
 exports.lock = function(username, lockId, callback) {
  getUser(username, function(user) {
    if(canLock(user, lockId)) {

      db.collection("locks").update({lockId: lockId}, {$set: {status: "locked"}}, 
        (err, numberAffected, rawResponse) => {
          if(!err) {
            addToHistory(username, lockId, "lock");
          }
          callback(true);
          return;
        })
    }
  })
}

/**
 * Adds action to history
 * @param: username, lockId, callback
 */
 function addToHistory(username, lockId, action) {
  db.collection("history").find({lockId: lockId}).toArray((err, result) => {
    let time = getTime();
    let date = new Date();
    date = date.toDateString();
    let dateTime = (date + " at " + time);

    let names = result[0].usernames;
    let actions = result[0].actions;
    let times = result[0].times;
    names.push(username);
    actions.push(action);
    times.push(dateTime);
    db.collection("history").update({lockId: lockId}, {$set: {usernames: names, actions: actions, times:times}});
  })
}

/**
 * Gets the history (past lock/unlock actions executed)
 * @param: lockId, callback
 * @return: history
 */
 exports.getLockHistory = function(lockId, callback) {
  db.collection("history").find({lockId: lockId}).toArray((err, result) => {
    callback(result[0]);
  })
}

/**
 * Adds a member to lock by adding specified user to database
 * 
 * Given user M who called the request
 * upon user M', lock L
 *  
 * M should be able to add M' as a member iff
 *    - isOwner(M, L) or isAdmin (M, L) (checked by calling canAddMembers)
 *    - M' is a user in the database
 *
 * @param: username, lockId
 * @return: true if added sucessfully, else false
 */
 exports.addMember = function(username, userToAdd, lockId, callback) {
   getUser(username, function(user) {
    if(canAddMembers(user, lockId)) {
      getUser(userToAdd, function(result) {
        if(result == undefined) {
          // User does not exist in the database, return error
          callback({message: "User does not exist!"});
          return;
        }
        else {
          lockContainsMember(userToAdd, lockId, function(alreadyContains) {
            if(alreadyContains) {
              // User already added to lock, return appropriate error
              callback({message: "User already added!"});
              return;
            }
            else {
              // Everything good, add user to lock
              addUserToLock(result, lockId);
              callback({message: "User successfully added!"});
              return;
            }
          })
        }
      })  
    }
  })
}//end addMember 

/**
 * Changes the status of a member to an admin
 * 
 * Given user M who called the request
 * upon user M', lock L, if M is an admin and M' is a member
 *  
 * M should be able to add M' as a admin iff
 *    - isOwner(M, L)
 *    - M' is a member in the database
 *
 * @param: username, userToAdmin, lockId
 * @return: message based on if it was successful
 */
exports.addAdmins = function(username, userToAdmin, lockId, callback) {
  getUser(username, function(user) {
    //check if this user can add admins
    getUser(username, function(user) {
      if(isOwner(user, lockId)) {
        //finds the user that wants to be changed to admin
        db.collection("users").find({"username": userToAdmin}).toArray((err, result) => {
          //find correct lock inside the locks array
          for(let i = 0; i < result[0].locks.length; i++){
            //once the lock is found, perform actions on this lock
            if(result[0].locks[i].lockId == lockId){
              //creates new lock object that will replace the one of this current lock
              let lockObject = {
                "lockId": result[0].locks[i].lockId, 
                "role": 1, 
                "lockRestrictions": [-1, -1], 
                "unlockRestrictions": [-1,-1]
              };
              //set the current index to the new lock object
              result[0].locks[i] = lockObject;
              //find the user again and update it, setting the new locks array to the result[0] which is now updated
              db.collection("users").update({username: userToAdmin}, {$set: {locks: result[0]}}, (err, numberAffected, rawResponse) => {})
              //callback message currently doesn't work
              callback({message:"User is now Admin"});
              return;
            }
          } 
        })
      }
    })
  })
}
        
/**
 * Unlock the lock and record any changes in the history
 * @param: username, lockId, callback
 * @return: false if not unlocked
 */
 exports.unlock = function(username, lockId, callback) {
  getUser(username, function(user) {
    if(canUnlock(user, lockId)) {
      db.collection("locks").update({lockId: lockId}, {$set: {status: "unlocked"}}, (err, numberAffected, rawResponse) => {
        if(!err) {
          addToHistory(username, lockId, "unlock");
        }
        callback(true);
        return;
      })
    }
  })
  return;
}

/**
 * Registers lock to database by recording lockId, role and restrictions 
 * if lock is already registered then send back failure 
 * @param: lockId, lockName, userName, callback
 */
 exports.registerLock = function(lockId, lockName, userName, callback) {

  db.collection("users").find({"username": userName, "locks.lockId": lockId}).toArray((err, result) => {
    if(result.length > 0) {
      // There are people with this lock so it must have been registered
    }
    else {
      // First person to try to register this lock
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

/**
 * Gets the status of the lock (whether it is locked or unlocked)
 * @param: lockId, callback
 * @return: string either "locked" or "unlocked"
 */
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

/**
 * Gets dashoard info including lockname and username
 * @param: username, lockId, callback
 */
 exports.getDashboardInformation = function(username, lockId, callback) {
  db.collection("locks").find({lockId: lockId}).toArray((err, result) => {
    let lockName = result[0].lockName;
    callback({username: username, lockName: lockName});
  })
}

/**
 * Checks if user can revoke admin priveldges 
 * @param: username, lockId, otherUser
 * return: true if can remove, else false
 */
 function canRevokeAdmin(username, lockId, otherUser) {
  return (isOwner(username, lockId) && isAdmin(otherUser, lockId));
}

/**
 * Check is user can remove members from lock 
 * @param: username, lockId, otherUser
 * retunr: true if can remove, else false
 */
 function canRemoveMem(username, lockId, otherUser) {
   return(isOwner(username, lockId) && isAdmin(otherUser, lockId) && isAdmin(user, lockId));
 }

/**
 * Check if user can add admins 
 * @param: username, lockId
 * @return: true if can add, else false
 */
function canAddAdmin(username,lockId){
   return(isOwner(username, lockId) || isAdmin(username, lockId));
}

/**
 * Checks if person can remove an admin, if they can then remove admin by
 * changing role number to 2
 * @param: username lockId, otherUser, callback
 * @return none
 */
 exports.revokeAdmin = function(username, lockId, otherUser, callback) {
  // if (canRevokeAdmin(username, lockID, otherUser)) {
  //   db.collection("users").find({"username": otherUser, "locks.lockId": lockId}).toArray((err, result) => {
  //     // returns false here if person isn't in lock
  //     if(result[0] == undefined) {
  //       callbakc(false);
  //     }

  //     let role = searchLocks(lockId, result[0].locks);
  //     if(role == 1) {
  //       let newRole = 2;
        
  //       db.collection("users").update({"username": otherUser, "locks.lockId": lockId}, {$set:{locks.}})
  //     }
  //   })
  // }
  // else{
  //   callbakc(false);
  // }
}

exports.insertActiveLock = function(activeLock) {
  console.log("inside active lock");
  db.collection("active-locks").insert(activeLock);
}

exports.deleteActiveLock = function(socketId) {
  console.log("inside delete active lock");
  db.collection("active-locks").deleteOne(socketId);
}

exports.test = function() {
  console.log("test");
}

module.exports.convertToMilitary = convertToMilitary;
module.exports.getTime = getTime;
