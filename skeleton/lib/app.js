// Don't mess these first few lines
const juice = require('juice');

var app = new juice.Application(module),
    proto = app.prototype;

var Post = proto.models.Posts = function Post (ctor, args) {
}

Post.prototype.all = function() {
}


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

