var express = require("express");
var router = require("./src/server.js");
var fs = require("fs");

const app = express();
app.use(express.static("./"));

app.use("/", router);

app.listen(8080, () => console.log("Server started. Press Ctrl+C to quit"));
