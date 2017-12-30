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
    $(".username").text("Welcome to the dashboard, " + data + "!");
  })
}

function registerLock() {
  $.post("/registerLock", {id: document.getElementById("id").value}, function(data) {
    if(data.redirect == "failure") {
      $(".lockTaken").text("Taken");
    }
    else {
      redirect(data);
    }
  }) 
}

