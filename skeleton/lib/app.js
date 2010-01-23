// Don't mess these first few lines
const juice = require('juice');

var app = new juice.Application(module),
    proto = app.prototype;

/*
Example model:
var DB = proto.models.DB = function( app ) {
  this.db = new require('sqlite3').SQLite3( app.config.dbname );
}

DB.prototype.all = function() {
  return this.db.query("SELECT * FROM table");
}

Then use it in a controller like:
proto.controllers.list = function ( ) {
  return { rows: this.models.DB.all() }
}
*/

// Your actions (well, just one action for now)
proto.controllers.index = function( ) {
  return {
    docroot : this.docRoot
  }
}

// URL mappings
proto.urls = {
  "/?" : "index",

  "/styles": { static: "./static/styles" },
  "/scripts": { static: "./static/scripts" }
};

// Don't mess with this, either
exports.app = app.asJSGI( );
exports.juice = app;

