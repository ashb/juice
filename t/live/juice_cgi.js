var juice = require('juice');
var app = new juice.Application;

app.controllers.index = function() {
  return {
    status: 200,
    headers: {},
    body: ["Hello Juicers!"]
  }
}
app.actions = { "/?" : { action: "index", raw: true } };
exports.app = app.setup();

require('juice/engine/cgi').run(exports.app);
