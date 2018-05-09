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
    let d = new Date();
  //convert the time accordingly in order to look it up in the database
  let timeInMilitary = "" + convertToMilitary(d.getHours() + ":" + d.getMinutes());
  //look up all events at that specified time
  db.collection("events").find({"time": timeInMilitary}).toArray((err, result) => {
    //for each of those locks, perform the appropriate actions (either lock or unlock)
    for (let i = 0; i < result.length; i++) {
      //if the action was to lock
      if (result[i].action == "lock") {
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
function isMember(userObject, lockId) {
    let role = searchLocks(lockId, userObject.locks);
    //return false here if person isn't in lock
    if(role == undefined){
      return false;
    }
      return (role == 2);
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
  let lock = undefined;
  for(let i = 0;  i < userObject.locks.length; i++) {
    if(userObject.locks[i].lockId == lockId) {
      lock = userObject.locks[i];
    }
  }
    // returns false here if person isn't in lock
  if(!lock) {
    return false;
  }
  let currentTime = convertToMilitary(getTime());
  if (action == "lock") {
    for(let i = 0; i < lock.lockRestrictions.length; i++) {
      if (lock.lockRestrictions[i][0] < currentTime && lock.lockRestrictions[i][1] > currentTime) {
        return true;
      }
    }
  } else {
    for(let i = 0; i < lock.unlockRestrictions.length; i++) {
      if (lock.unlockRestrictions[i][0] < currentTime && lock.unlockRestrictions[i][1] > currentTime) {
        return true;
      }
    }
  }
  return false;
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
  /  *  1.) They are an owner of the lock
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
    // if (timeArray[0] < 10) {
    //   timeArray[0] = "0" + timeArray[0];
    // }
    if (timeArray[0] < 10) {
      return ("0" + parseInt(timeArray[0] + timeArray[1]));
    }
    return (parseInt(timeArray[0].toString() + timeArray[1]));
  }


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
      else{
        callback({message: "You don't have the permission to add events!"});
        return;
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
    // validate user in case the user does not exist


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
      callback("error");
    }
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
    /**
     * THIS IS WAAAAAAY TOO LONG
     */


    if(action != "lock" && action != "unlock"){
      callback({message: "Please select lock or unlock"});
      return;
    }
    if(start >= end){
      callback({message: "Invalid time range!"});
      return;
    }
    //check if start and end is in military time
    //convertToMilitary(start);
    // convertToMilitary(end);
    //get the user requesting to make a change to the role of another user
    getUser(username, function(user) {
      getUser(userToChange, function(user2){
        //check if user requesting is allowed to make this request
        if(isOwner(user, lockId) || isAdmin(user, lockId)) {
          let result = isMember(user2, lockId);
          if(!isMember(user2, lockId)) {
            callback({message: "The user whose restrictions to be added should be a memeber"});
            return;
          }
            //check the action to perform
            if(action == "lock"){
              let lockRes = [start, end];
              //find the user in the database
              db.collection("users").find({"username": userToChange}).toArray((err, result) => {
                if(result[0] == undefined) {
                  return;
                }
                //find the correct lock inside the locks array
                for(let i=0; i< result[0].locks.length; i++){
                  //look for specific lock
                  if(result[0].locks[i].lockId == lockId){
                    //create a new lock oject that will replace the one of
                    //this current lock
                    let lockResArray = result[0].locks[i].lockRestrictions;
                    let unlockResArray = result[0].locks[i].unlockRestrictions;
                    lockResArray.push(lockRes);
                    let roleUp = result[0].locks[i].role;
                    let lockObject = {
                      "lockId": result[0].locks[i].lockId,
                      "role":roleUp,
                      "lockRestrictions": lockResArray,
                      "unlockRestrictions": unlockResArray
                    };
                    //set current index to the new lock object
                    result[0].locks[i] = lockObject;
                    //find user again to update it setting the newlocks array
                    //to the result[0] which is now updated
                    db.collection("users").update({username: userToChange}, {$set: {locks: result[0].locks}}, (err, numberAffected,rawResponse) => {});
                    //callback message to state that action is completed
                    callback({message:"Added user lock restriction"});
                    return;
                  }
                }
              });

            }//end if
            else if(action == "unlock"){
              let unlockRestrictions = [start, end];
              //find user in database
              db.collection("users").find({"username": userToChange}).toArray((err, result) => {
                if(result[0] == undefined) {
                  return;
                }
                //find correct lock inside locks array
                for(let i=0; i<result[0].locks.length; i++){
                  //look for lock inside locks array of user
                  if(result[0].locks[i].lockId == lockId){
                    let unlockResArray = result[0].locks[i].unlockRestrictions;
                    let lockResArray = result[0].locks[i].lockRestrictions
                    unlockResArray.push(unlockRestrictions);
                    let roleUp = result[0].locks[i].role;
                    //create a new lock objectg to replac old one
                    let lockObject = {
                      "lockId" : result[0].locks[i].lockId,
                      "role": roleUp,
                      "lockRestrictions": lockResArray,
                      "unlockRestrictions": unlockResArray
                    };

                    //set current index to the new lock oject
                    result[0].locks[i] = lockObject;
                    //find user again and update
                    db.collection("users").update({username: userToChange}, {$set: {locks: result[0].locks}}, (err, numerAffected, rawResponse) => {});
                    //callback message
                    callback({message: "Added user unlock restriction"});
                    return;
                  }//end if statement
                }//end for loop
              });
            }//end else if
          }
        //if requester does not have access return callback message
        else{
          callback({message:"User must be an Owner or an Admin to create restrictions"});
          return;
        }
      })
    })
  }

/**
* Gets the members of a specific lock
* @param lockId - the lock Id of the lock that we want to get members of
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

/**
* Gets the admins of a specific lock
* @param: lockId - the lock id of lock whose admins we want
* @return: array of admins
*/
exports.getLockAdmins = function(lockId, callback) {
  // Validate lock id in case it doesn't exist

  db.collection("locks").find({lockId: lockId}).toArray((err, result) => {
    let allMembers = result[0].members;
    let adminArray = [];

    async.each(allMembers, function(member, callback) {
      db.collection("users").find({"username": member}).toArray((err, result) => {
        for(let i = 0;  i < result[0].locks.length; i++) {
          if(result[0].locks[i].lockId == lockId && result[0].locks[i].role == 1 ) {
            adminArray.push(member);
          }
        }
        callback();
      })
    }, function(err) {
      // if any of the file processing produced an error, err would equal that error
      if( err ) {
        console.log("There is some error!");
      } else {
        if(adminArray.length == 0){
          adminArray.push("There are no members currently associated with this lock");
        }
        callback(adminArray);
      }
    });

  })
}

/**
* Get the list of locks of the specific user
* @param: username, callback
* @return: locknames
*/
exports.getLocks = function(username, callback) {
  // validate user in case it doesn't exist

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

  // validate user in case it doesn't exist
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

  // validate user in case it doesn't exist 
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

  // validate lockId in case it doesn't exist

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
  //check if this user can add admins
  getUser(username, function(user) {
    getUser(userToAdmin, function(user2) {
      if(user == undefined || user2 == undefined) {
        callback({message: "error!"});
        return;
      }
      if(isOwner(user, lockId) && !isOwner(user2, lockId)) {
        if(isAdmin(user2, lockId)){
          callback({message: "User is already an admin"});
          return;
        }
        else{
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
                  "lockRestrictions": [["-1", "-1"]],
                  "unlockRestrictions": [["-1", "-1"]]
                };
                //set the current index to the new lock object
                result[0].locks[i] = lockObject;
                //find the user again and update it, setting the new locks array to the result[0] which is now updated
                db.collection("users").update({username: userToAdmin}, {$set: {locks: result[0].locks}}, (err, numberAffected, rawResponse) => {})
                //callback message currently doesn't work
                callback({message: "User is now Admin"});
                return;
              }
            }
          })
        }
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

  // validate user in case it doesn't exist 
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
      return;
    }
  })

  // careful at async issues here, might want to take a closer look


  db.collection("locks").find({lockId: lockId}).toArray((err, result) => {
    if(result[0].owner == undefined) {

      // add the user to the lock
      db.collection("users").find({username: userName}).toArray((err, result) => {
        var locksArray = result[0].locks;
        var lockObject = {
          "lockId": lockId,
          "role": 0,
          "lockRestrictions": [["-1", "-1"]],
          "unlockRestrictions": [["-1", "-1"]]
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

  // what if lock doesn't exist?
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
    return(isOwner(username, lockId));
  }

  /**
  * Check if user can add admins
  * @param: username, lockId
  * @return: true if can add, else false
  */

  function canAddAdmin(username,lockId){
    return(isOwner(username, lockId));
  }

  /**
  * Checks if person can remove an admin, if they can then remove admin by
  * changing role number to 2
  * @param: username lockId, otherUser, callback
  * @return none
  */
  exports.revokeAdmin = function(username, lockId, otherUser, callback) {
    getUser(username, function(userOne) {
      getUser(otherUser, function(userTwo) {
        if(userOne == undefined || userTwo == undefined) {
          callback({message: "ERROR"});
          return;
        }
        if(isOwner(userOne, lockId)) {
          db.collection("users").find({username: otherUser}).toArray((err, result) => {
            if(result[0] == undefined) {
              callback({message: "ERROR"});
              return;
            }
            //loop through the lock to find the specific lock Id
            for(let i = 0; i < result[0].locks.length; i++) {
              //Once the lock Id is found, create a new lock object
              if(result[0].locks[i].lockId == lockId) {
                let lockObject = {
                  "lockId": lockId,
                  "role": 2,
                  "lockRestrictions": [],
                  "unlockRestrictions": []
                };
                //set the current index to the new lock object
                result[0].locks[i] = lockObject;
                //update the database
                db.collection("users").update({username: otherUser}, {$set:{locks: result[0].locks}}, (err, numberAffected, rawResponse) =>{})
                //callback message currently doesn't work
                callback({message: "User is now a member!!!!"});
                return;
              }
            }            
          })
        }
      })
    })
  }

  exports.removeMember = function(username, lockId, otherUser, callback) {
    let message = "what";
    console.log("user to remove is " + otherUser);
    getUser(username, function(user) {
      if (isOwner(user, lockId)) {

        //updates and deleted the lock from the users collection for that user
        db.collection("users").find({"username": otherUser}).toArray((err, result2) => {
          if(result2.length == 0) {
            console.log("USER DOES NOT EXIST");
            callback({message: "ERROR"});
            return;
            console.log("after return");
          }
          //go through the locks array and change the lock to delete to NULL
          let newLocksArray = [];
          //if is was not the the lock we deleted, then we add it into new array
          for (let i = 0; i < result2[0].locks.length; i++) {
            if (result2[0].locks[i] != lockId) {
              newLocksArray.push(result2[0].locks[i]);
            }
          }
          //update the locks array for the user that we wanted to delete from that lock
          db.collection("users").update({username: otherUser}, {$set: {locks: newLocksArray}}, (err, numberAffected, rawResponse) => {})

          //updates the members array in the locks collection for that lockId
          db.collection("locks").find({"lockId": lockId}).toArray((err, result) => {
            if(result.length == 0) {
              console.log("LOCK DOES NOT EXIST");
              callback({message: "ERROR"});
              return;
            }  
            let newArray = [];
            //if is was not the the user we deleted, then add into the new array
            for (let i = 0; i < result[0].members.length; i++) {
              if (result[0].members[i] != otherUser) {
                newArray.push(result[0].members[i]);
              }
            }
            //update the members array for this lock to the new array
            db.collection("locks").update({lockId: lockId}, {$set: {members: newArray}}, (err, numberAffected, rawResponse) => {})
            callback({message: "User Successfully Deleted"});
          })

        })

      }
      else {
        console.log("NOT OWNER");
      }
    })
  }

// try to move active locks away from DB and into a global variable
exports.insertActiveLock = function(activeLock) {
  db.collection("active-locks").insert(activeLock);
}

exports.deleteActiveLock = function(socketId) {
  db.collection("active-locks").deleteOne(socketId);
}

exports.getSocketId = function(username, lockId, callback) {

  db.collection("active-locks").find({lockId: lockId}).toArray((err, result) => {
    getUser(username, function(user) {
      if(user == undefined) {
        callback({Error: "User does not exist!"});
      }
    })
    if(result.length) {
      callback({socketId: result[0].socketId});
    }
    else {
      callback(false);
    }
  })
}

exports.getDefaultState = function(lockId, callback) {
  db.collection("locks").find({lockId: lockId}).toArray((err, result) => {
    callback(result[0].status);
  })
}

module.exports.convertToMilitary = convertToMilitary;
module.exports.getTime = getTime;
