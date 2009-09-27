
var utils = require('juice/utils');
var juice = exports;

juice.Utils = utils;
juice.Application = require('juice/application').Application;
juice.Context = require('juice/context').Context;

// Lazy loader
juice.CGI = {
  run: function run(env) {
    return require('juice/engine/cgi').run(env);
  }
}
juice.run = function run(app, engine) {
  engine = engine || juice.CGI;

  var closure = function app_closure(env) { return app.run(env) };
  return engine.run(closure);
}
