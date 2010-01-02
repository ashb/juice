
var utils = require('./juice/utils');
var juice = exports;

juice.Utils = utils;
juice.Application = require('./juice/application').Application;
juice.Context = require('./juice/context').Context;

// This doens't deserve its own class just yet.
juice.Response = function Response(ctx) {
  this.ctx = ctx;
}

juice.Response.getStatusOrDefault = function(res, def) {
  return "status" in res ? res.status : def;
}

juice.Response.prototype.redirect = function( url, status ) {
  this.headers['location'] = this.ctx.urlFor( url );

  if ( status !== undefined ) this.status = status;
}

// Lazy loader
juice.CGI = {
  run: function run(env) {
    return require('./juice/engine/cgi').run(env);
  }
}
juice.run = function run(app, engine) {
  engine = engine || juice.CGI;

  var closure = function app_closure(env) { return app.run(env) };
  return engine.run(closure);
}
