function onSignIn(googleUser) {
  var profile = googleUser.getBasicProfile();
  console.log('ID: ' + profile.getId()); // Do not send to your backend! Use an ID token instead.
  console.log('Name: ' + profile.getName());
  console.log('Image URL: ' + profile.getImageUrl());
  console.log('Email: ' + profile.getEmail()); // This is null if the 'email' scope is not present.
  if(googleUser) {
    $.get("/authenticate", {email: profile.getEmail()}, redirect);
  }
}

function redirect(data) {
  window.location = data.redirect;
}

function loadDashboard() {
  $.get("/dashboardInformation", function(data) {
    $(".username").text(data);
    $(".header").text("Welcome to the dashboard, " + data + "!");
  })
}

function registerLock() {
  $.post("/registerLock", {id: document.getElementById("id").value, lockName: document.getElementById("lock-name").value}, function(data) {
    if(data.redirect == "failure") {
      $(".lockTaken").text("Taken");
    }
    else {
      redirect(data);
    }
  }) 
}

function getLockStatus() {
  $.get("/lockStatus", function(data) {
    if(data.status == "locked") {
      $("#lock-action").text("unlock");
      $("#lock-status").text("locked");
    }
    else {
      $("#lock-action").text("lock");
      $("#lock-status").text("unlocked");
    }
    console.log(data.status);
  })
}

function changeLock() {
  if (document.getElementById("lock-status").innerHTML == "locked") {
    $.post("/unlock", getLockStatus);
  }
  else {
    $.post("/lock", getLockStatus);
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

function addMember() {
  $("#add-member-form").submit(function(event) {
    event.preventDefault();
    $.post("/addMember", {username: document.getElementById("username").value}, function(data) {
      document.getElementById("resposne-message").innerHTML = data.message;
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

function getName() {
  $.get("/getName", function(name) {
    document.getElementById("lock-name").value = (name + "'s Lock");
  })

}

