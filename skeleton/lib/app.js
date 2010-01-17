// Don't mess these first few lines
const juice = require('juice');

var app = new juice.Application(module);


// Your actions (well, just one action for now)
app.controllers.index = function( ) {
  return {
    docroot : this.docRoot
  }
}

// URL mappings
app.urls = {
  "/?" : "index",

  "/styles": { static: "./static/styles" },
  "/scripts": { static: "./static/scripts" }
};

// Don't mess with this, either
exports.app = app.jsgify( );
exports.juice = app;

