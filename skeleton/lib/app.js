// Don't mess these first few lines
const juice = require('juice'),
      DOC_ROOT = module.uri.replace(/^.*?:\/\/(.*?)lib\/app\.js$/, "$1") || "./";

var app = new juice.Application;


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
exports.app = app.setup( DOC_ROOT );

