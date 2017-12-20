var express = require("express");
var mongoClient = require("mongodb").MongoClient;
var db = undefined;
var app = express();
var dir = __dirname;

// Used to make the server look in our directory for 
  // our javascript, css, and other files
app.use(express.static(dir));

mongoClient.connect("mongodb://ersp:abc123@ds044917.mlab.com:44917/smart-lock", (err, database) => {
  if(err) {
    return console.log(err);
  }

  db = database;
  app.listen(3000, function() {
    console.log("listening on 3000");
  })
})

app.get("/", (req, res) => {
  res.sendFile(dir + "/views/index.html");
})