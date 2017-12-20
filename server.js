var express = require("express");
var app = express();
var dir = __dirname;

app.listen(3000, function() {
  console.log("listening on 3000");
})

app.get("/", (req, res) => {
  res.sendFile(dir + "/views/index.html");
})