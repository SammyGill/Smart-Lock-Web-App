"use strict";
var email;
var name;
function onSignIn(googleUser) {
  if(googleUser) {
    var profile = googleUser.getBasicProfile();
    name = profile.getName();
    email = profile.getEmail();
    //console.log("email in onSignIn: " + email);
    $.get("/authenticate", {email: profile.getEmail(), fullname: profile.getName()}, function(data) {
      if(data.locks.length > 1) {
        window.location = "selectLock";
      }
      else if(data.locks.length == 0) {
        window.location = "register";
      }
      else {
        window.location = "dashboard";
      }
    })
  }
}

function loadDashboard() {
  $.get("/dashboardInformation", function(data) {
    $(".username").text(name);
    $(".lockname").text(data.lockName);
    $(".header").text("Welcome to " + data.lockName + ", " + name + "!");
  })
}

function loadLocks(){
  $.get("/getLocks", function(data) {
    let list = document.getElementById("dashboardComponents");
    for(var i = 0; i < data.locks.length; i++) {
      var lock = document.createElement("a");
      lock.appendChild(document.createTextNode(data.lockNames[i]));
      lock.setAttribute("class", "sidenav-second-level collapse locksonSiderbar");
      lock.setAttribute("id", data.locks[i]);
      var lockElement = document.createElement("li");
      lockElement.appendChild(lock);
      list.appendChild(lockElement);
    }
  })
}

function switchLock() {
  $(document).on("click", ".locksonSiderbar", function(element) {
    $.get("/switchLock", {lockId: event.target.id}, function() {
      window.location = "dashboard";
    })
  })
}

function loadSettings() {
  $.get("/getSettings", function(data) {
    let list = document.getElementById("settingsComponents");
    for(var i = 0; i < data.setting.length; i++) {
      var setting = document.createElement("a");
      setting.appendChild(document.createTextNode(data.setting[i]));
      setting.setAttribute("class", "sidenav-second-level collapse settingsonSiderbar");
      setting.setAttribute("id", data.setting[i]);
      var settingElement = document.createElement("li");
      settingElement.appendChild(setting);
      list.appendChild(settingElement);
    }
  })

}


function swtichSettings() {
  $(document).on("click", ".settingsonSiderbar", function(element) {
    $.get("/switchSettings", {setting: event.target.id}, function(data) {
      // console.log("data in switchSettings is: " + data);
      window.location = data;
    })
  })
}

// function selectDashboard() {
//   $(document).on("click", ".lock", function(element) {
//     $.get("/selectDashboard", {lockId: event.target.id}, function() {
//       window.location = "/dashboard";
//     })
//   })
// }

function registerLock() {
  //console.log("user name in scripts.js is : " + email);
  $.post("/registerLock", {id: document.getElementById("id").value, lockName: document.getElementById("lock-name").value}, function(data) {
    if(data.redirect == "failure") {
      $(".lockTaken").text("Taken");
    }
    else {
      window.location = data.redirect;
    }
  })
}

/*function getLockStatus() {
  $.get("/lockStatus", function(data) {
    if(data.status == "locked") {
      $("#lock-action").text("unlock");
      $("#lock-status").text("locked");
    }
    else {
      $("#lock-action").text("lock");
      $("#lock-status").text("unlocked");
    }
  })
}

function request() {
  
}*/


function getTime() {
  $.get("/timeStatus", function(data) {
    $("#time").text(data);
  })
  setTimeout(function () {
    getTime();
  }, 1000);
}

function addMember() {
  $("#add-member-form").submit(function(event) {
    event.preventDefault();
    $.post("/addMember", {username: document.getElementById("username").value}, function(data) {
      document.getElementById("response-message").innerHTML = data.message;
    })
  })
}

function addTimer() {
  var $select = $(".1-12");
  for (i=1; i<=12; i++) {
    $select.append($('<option></option>').val(i).html(i))
  }
  var $select = $(".0-60");
  for (i=0; i<=60; i++) {
    var j = i;
    if (j < 10) {
      j = "0" + j
    }
    $select.append($('<option></option>').val(j).html(j))
  }
}


function getName() {
  $.get("/getName", function(name) {
    document.getElementById("lock-name").value = (name + "'s Lock");
  })

}
function getLocks() {
  $.get("/getLocks", function(data) {
    var list = document.getElementById("locks-list");
    for(var i = 0; i < data.locks.length; i++) {
      var button = document.createElement("button");
      button.appendChild(document.createTextNode(data.lockNames[i]));
      button.setAttribute("class", "lock")
      button.setAttribute("id", data.locks[i]);
      var lockElement = document.createElement("li");
      lockElement.appendChild(button);

      list.appendChild(lockElement);
    }
  })
}

function selectDashboard() {
  $(document).on("click", ".lock", function(element) {
    $.get("/selectDashboard", {lockId: event.target.id}, function() {
      window.location = "/dashboard";
    })
  })
}



function loadTimes() {
  for(var i = 0; i < 60; i++) {
    var select = document.getElementById("minute");
    var time = document.createElement("option");
    if(i < 10) {
      time.text = "0"+i;
    }
    else {
      time.text = i;
    }
    select.add(time);
  }
  for(var i = 1; i < 13; i++) {
    var select = document.getElementById("hour");
    var time = document.createElement("option");
    time.text = i;
    select.add(time);
  }
}

function loadTimesTwo() {
  for(var i = 0; i < 60; i++) {
    var select = document.getElementById("minuteTwo");
    var time = document.createElement("option");
    if(i < 10) {
      time.text = "0"+i;
    }
    else {
      time.text = i;
    }
    select.add(time);
  }
  for(var i = 1; i < 13; i++) {
    var select = document.getElementById("hourTwo");
    var time = document.createElement("option");
    time.text = i;
    select.add(time);
  }
}

function getMembers() {
  $.get("/getMembers", function(data) {
    var list = document.getElementById("membersList");
    for(var i = 0; i < data.members.length; i++) {
      var member = document.createElement("li");
      member.appendChild(document.createTextNode(data.members[i] /*+ ": " + data.fullnames[i]*/));
      list.appendChild(member);
    }
  })
}

function showHistory() {
  $.get("/showHistory", function(data) {
    var list = document.getElementById("historyList");
    for(var i = data.members.length - 2; i > data.members.length - 7; i--) {
      var mem = document.createElement("ul");
      mem.appendChild(document.createTextNode("Last " + data.memActions[i] + "ed at " + data.members[i]));
      list.appendChild(mem);
    }
  })
}


function signOut() {
  var auth2 = gapi.auth2.getAuthInstance();
  auth2.signOut().then(function () {
  });
  // $.get("/signOut", function(data) {
  // });
}

function onLoad() {
  gapi.load('auth2', function() {
    gapi.auth2.init();
  });
}

function createRule() {
  $("#add-rules-form").submit(function(e) {
    e.preventDefault();
  })

  var action = undefined;
  if(document.getElementById("unlock").checked) {
    action = "unlock";
  }
  else {
    action = "lock";
  }
  var hourSelect = document.getElementById("hour")
  var hourOption = hourSelect.options[hourSelect.selectedIndex].text;
  var minuteSelect = document.getElementById("minute")
  var minuteOption = minuteSelect.options[minuteSelect.selectedIndex].text;
  var periodSelect = document.getElementById("period")
  var periodOption = periodSelect.options[periodSelect.selectedIndex].text;
  var time = hourOption + ":" + minuteOption + " " + periodOption;


  $.get("/canAccess", function(data) {
   if (data.access == false) {
     $.get("/createRule", function(data) {
      console.log("Should be in here...");
      event.preventDefault();
      document.getElementById("response-message").innerHTML = data.message;
    })
   } else {
     console.log("should create rule");
     $.post("/createRule", {action: action, time: time});
   }
 })
}

// function registerLock() {
//   $.post("/registerLock", {id: document.getElementById("id").value, 
//     lockName: document.getElementById("lock-name").value, userName: document.getElementById("lock-name").value, 
//   }, function(data) {
//     if(data.redirect == "failure") {
//       $(".lockTaken").text("Taken");
//     }
//     else {
//       window.location = data.redirect;
//     }
//   })
// }

function getLockStatus() {
  $.get("/lockStatus", function(data) {
    if(data.status == "locked") {
      $("#lock-action").text("unlock");
      $("#lock-status").text("locked");
			socket.emit("initial", 0);
    }
    else {
      $("#lock-action").text("lock");
      $("#lock-status").text("unlocked");
			socket.emit("initial", 1);
    }
  })
}

function changeLock() {
 if (document.getElementById("lock-status").innerHTML == "locked") {
 // Send request to change lock...
  socket.emit("request", 1);
  } else {
	socket.emit("request", 0);
  }
  // Response when the lock has been changed
  socket.on("response", function(data) {
    console.log(data);
  }) 
  if (document.getElementById("lock-status").innerHTML == "locked") {
    $.post("/unlock", function(data) {
      if(data.error) {
        $(".error-message").text(data.error);
      }
      else {
        $(".error-message").text("");
        getLockStatus();
      }
    });
  }
  else {
    $.post("/lock", function(data) {
      if(data.error) {
        $(".error-message").text(data.error);
      }
      else {
        $(".error-message").text("");
        getLockStatus();
      }
    });
  }
}


function getTime() {
  $.get("/timeStatus", function(data) {
    $("#time").text(data);
  })
  setTimeout(function () {
    getTime();
  }, 1000);
}

function addTimer() {
  var $select = $(".1-12");
  for (i=1; i<=12; i++) {
    $select.append($('<option></option>').val(i).html(i))
  }
  var $select = $(".0-60");
  for (i=0; i<=60; i++) {
    var j = i;
    if (j < 10) {
      j = "0" + j
    }
    $select.append($('<option></option>').val(j).html(j))
  }
}


function getName() {
  $.get("/getName", function(name) {
    document.getElementById("lock-name").value = (name + "'s Lock");
    //document.getElementById("email").value = (name);
  })

}


function getLocks() {
  $.get("/getLocks", function(data) {
    var list = document.getElementById("locks-list");

    for(var i = 0; i < data.locks.length; i++) {
      var button = document.createElement("button");
      button.appendChild(document.createTextNode(data.lockNames[i]));
      button.setAttribute("class", "lock");
      button.setAttribute("id", data.locks[i]);
      var lockElement = document.createElement("li");
      lockElement.appendChild(button);

      list.appendChild(lockElement);
    }
  })
}


function selectDashboard() {
  $(document).on("click", ".lock", function(element) {
    $.get("/selectDashboard", {lockId: event.target.id}, function() {
      window.location = "/dashboard";
    })
  })
}

function loadTimes() {
  for(var i = 0; i < 60; i++) {
    var select = document.getElementById("minute");
    var time = document.createElement("option");
    if(i < 10) {
      time.text = "0"+i;
    }
    else {
      time.text = i;
    }
    select.add(time);
  }
  for(var i = 1; i < 13; i++) {
    var select = document.getElementById("hour");
    var time = document.createElement("option");
    time.text = i;
    select.add(time);
  }
}

function loadTimesTwo() {
  for(var i = 0; i < 60; i++) {
    var select = document.getElementById("minuteTwo");
    var time = document.createElement("option");
    if(i < 10) {
      time.text = "0"+i;
    }
    else {
      time.text = i;
    }
    select.add(time);
  }
  for(var i = 1; i < 13; i++) {
    var select = document.getElementById("hourTwo");
    var time = document.createElement("option");
    time.text = i;
    select.add(time);
  }
}

function signOut() {
  var auth2 = gapi.auth2.getAuthInstance();
  auth2.signOut().then(function () {
  });
}

function onLoad() {
  gapi.load('auth2', function() {
    gapi.auth2.init();
  });
}

/*function createRule() {
  var hourSelect = document.getElementById("hour")
  var hourOption = hourSelect.options[hourSelect.selectedIndex].text;
  var minuteSelect = document.getElementById("minute")
  var minuteOption = minuteSelect.options[minuteSelect.selectedIndex].text;
  var periodSelect = document.getElementById("period")
  var periodOption = periodSelect.options[periodSelect.selectedIndex].text;
  var time = hourOption + ":" + minuteOption + " " + periodOption;
  $.post("/createRule", {action: action, time: time});
}*/

function updateRole() {
  var canAddMembers = document.getElementById("can-add-members").checked;
  var canCreateRules = document.getElementById("can-create-rules").checked;
  var canManageRoles = document.getElementById("can-manage-roles").checked;
  var usernameSelect = document.getElementById("members");
  var username = usernameSelect.options[usernameSelect.selectedIndex].text;
  $.post("/updateRole", {username: username, canAddMembers: canAddMembers, canCreateRules: canCreateRules, canManageRoles: canManageRoles});
  var action = undefined;
  if(document.getElementById("addMembers").checked) {
    canAddOthers = "yes";
  }
  else {
    canAddOthers = "no";
  }

  if(document.getElementById("unlock").checked) {
    action = "unlock";
  }
  else {
    action = "lock";
  }
  
  /*
    //var errName = $("#invalidTime"); //Element selector
    //errName.html("Invalid Time"); // Put the message content inside div
  } else {
    $.post("/createRole", {timeOne: time, timeTwo: timeTwo});
  } 
  */
}

function getMembersDropDown() {
  $.get("/getMembers", function(data) {
    var select = document.getElementById("members");
    for(var i = 0; i < data.members.length; i++) {
      var option = document.createElement("option");
      option.text = data.members[i];
      if (option.text != data.owner) {
        select.add(option);
      }
    }
    select.selectedIndex = "0";  
    getMemberInfo();

  })

}

function getMemberInfo() {
  var memberSelect = document.getElementById('members');
  var memberOption = memberSelect.options[memberSelect.selectedIndex].text;
  $.get("/memberRoleInfo", {username: memberOption}, function(data) {
    if(!data.roles) {
      document.getElementById("can-manage-roles").checked = true;
      document.getElementById("can-add-members").checked = true;
      document.getElementById("can-create-rules").checked = true;
    }
    else {
      document.getElementById("can-manage-roles").checked = data.roles.canManageRoles;
      document.getElementById("can-add-members").checked = data.roles.canAddMembers;
      document.getElementById("can-create-rules").checked = data.roles.canCreateRules;
    }
  })
}

function addTimeRestriction() {
  var memberSelect = document.getElementById('members');
  var memberOption = memberSelect.options[memberSelect.selectedIndex].text;

  var action = undefined;
  if(document.getElementById("unlock").checked) {
    action = "unlock";
  }
  else {
    action = "lock";
  }

  var roleLabel = document.getElementById("roleName")
  var hourSelect = document.getElementById("hour")
  var hourOption = hourSelect.options[hourSelect.selectedIndex].text;
  var minuteSelect = document.getElementById("minute")
  var minuteOption = minuteSelect.options[minuteSelect.selectedIndex].text;
  var periodSelect = document.getElementById("period")
  var periodOption = periodSelect.options[periodSelect.selectedIndex].text;

  var hourTwoSelect = document.getElementById("hourTwo")
  var hourTwoOption = hourTwoSelect.options[hourTwoSelect.selectedIndex].text;
  var minuteTwoSelect = document.getElementById("minuteTwo")
  var minuteTwoOption = minuteTwoSelect.options[minuteTwoSelect.selectedIndex].text;
  var periodTwoSelect = document.getElementById("periodTwo")
  var periodTwoOption = periodTwoSelect.options[periodTwoSelect.selectedIndex].text;
  var time = hourOption + ":" + minuteOption + " " + periodOption;
  var timeTwo = hourTwoOption + ":" + minuteTwoOption + " " + periodTwoOption;
  hourOption = parseInt(hourOption);
  hourTwoOption = parseInt(hourTwoOption);
  minuteOption = parseInt(minuteOption);
  minuteTwoOption = parseInt(minuteTwoOption);
  if (periodOption == "PM") {
    hourOption = hourOption + 12;
  } 
  if (periodTwoOption == "PM") {
    hourTwoOption = hourTwoOption + 12;
  }
  if (hourTwoOption < hourOption || (hourTwoOption == hourOption && minuteTwoOption < minuteOption)) {
   //$("#addingRoles").submit(function(event) {
    event.preventDefault();
    document.getElementById("invalidTime").innerHTML="That is an invalid time. Please try again!";
    //})
  }
  event.preventDefault();
  $.post("/addTimeRestriction", {username: memberOption, action: action, startTime: time, endTime: timeTwo}, function(data) {
    if(data.error) {
      $(".error-message").text(data.error);
    }
    else {
      $(".error-message").text("");
    }

  })  

}


function canAddMembers() {
  $.get("/canAccess", function(data) {
   if (data.roles.canAddMembers == false) {
    console.log
    console.log("I am in here");
    event.preventDefault();
    document.getElementById("add-member-form").style.display = "none";
    document.getElementById("remove-member-form").style.display = "none";
    document.getElementById("invalidAccess").innerHTML="You don't have access to this page!";
    //document.getElementById("invalidAccess").innerHTML="You don't have access to this page!";
  } 
    //var line1 = '<div class="form-group col-md-4">';
    //var line1 = "<div id='member-form' class='form-group col-md-4'><h3 id='response-message'></h3><label for='exampleInputEmail1'>Email address</label><input type='email' class='form-control' id='username' aria-describedby='emailHelp' placeholder='Enter email'><small id='emailHelp' class='form-text text-muted'>We'll never share your email with anyone else.</small></div>";
    //var line7 = '<button onclick="addMember();" class="btn btn-primary">Submit</button>';
    //$("#add-member-form").after(line1, line7); 
    //$("#add-member-form").after(line7);
  })
}


function canAddRules() {
  $.get("/canAccess", function(data) {
   if (data.roles.canCreateRules == false) {
    event.preventDefault();
    document.getElementById("add-rules-form").style.display = "none";
    document.getElementById("invalidAccess").innerHTML="You don't have access to this page!";
  } else {
     //var line = '<div class="btn-group" data-toggle="buttons"><label class="btn btn-primary" style="background-color:grey;"><input type="radio" autocomplete="off" disabled > I want to...</label><label class="btn btn-primary active" aria-pressed="true" ><input type="radio" autocomplete="off" id="lock"> Lock </label><label class="btn btn-primary"><input type="radio" autocomplete="off" id="unlock"> Unlock</label></div><div class="form-group col-md-4"><label for="roleSelect">every day at...</label><br><select class="form-control col-md-3" id="hour" style="display:inline"></select><select class="form-control col-md-3" id="minute" style="display:inline"></select><select class="form-control col-md-3" id="period" style="display:inline"><option> AM </option><option> PM </option></select></div><button class="btn btn-primary" style="display:inline" onclick="createRule();">Submit</button>';
      //$("#add-rules-form").after(line);
    }
  })   
}


function canAddRoles() {
  $.get("/canAccess", function(data) {
   if (data.roles.canManageRoles == false) {
    //document.getElementyId().style.display="none";
    event.preventDefault();
    document.getElementById("addingRoles").style.display = "none";
    document.getElementById("invalidAccess").innerHTML="You don't have access to this page!";
  }
})
}

