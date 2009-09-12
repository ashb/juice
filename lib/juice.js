
var utils = require('./juice/utils');
var juice = exports;

juice.Utils = utils;
juice.Application = require('./juice/application').Application;

// Lazy loader
juice.CGI = {
  run: function(env) {
    return require('./juice/engine/cgi').run(env);
  }
}

juice.run = function(app, engine) {
  engine = engine || juice.CGI;

  return engine.run(function(env) { return app.run(env) });
}
