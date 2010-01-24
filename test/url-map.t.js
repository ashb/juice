const test = require('test'),
      asserts = test.asserts,
      App = require('juice').Application,
      qmock = require('./lib/juice-test');

// TEST:
//   Check that buildAction behaves as expected for various different cases

function setup(test) {
  return function() {
    var app = qmock.mock_app( module );
    app.buildAction = App.prototype.buildAction;
    return test(app);
  }
}

exports.test_inline_action = setup(function(app) {
  var cb = function() { },
      res = app.buildAction( "/foo", cb );

  // TODO: rename this to res.controller
  asserts.same(res.controller, cb, "controller correct for literal function '/foo'")
  asserts.same(res.__matcher, /^\/foo$/, "action's matcher correct");
  // TODO: rename this to template or default_template
  asserts.same("render" in res, false, "action template not inferred for function actions");

  res = app.buildAction( "/foo/bar", { controller: cb } );
  asserts.same(res.controller, cb, "controller correct for action hash '/foo/bar'")
  asserts.same(res.__matcher, /^\/foo\/bar$/, "action's matcher correct");
  asserts.same("render" in res, false, "action template not inferred for function actions");
})

exports.test_named_action = setup(function(app) {
  var foo_cb = function() { },
      foo_bar_cb = function() { };

  // The qmock API is a little bit batty. Or lacking docks. one or the other
  // You cant throw an error from a mocked method it seems.

  app.expects(2)
     .method("controller")
     .interface(
    { accepts: ["foo"], returns: foo_cb },
    { accepts: ["foo.bar"], returns: foo_bar_cb }
  );

  var res = app.buildAction("/foo", "foo");
  asserts.same(res.controller, foo_cb, "controller correct '/foo'")
  asserts.same(res.__matcher, /^\/foo$/, "action's matcher correct");
  asserts.same(res.render, "foo", "action template inferred");

  var res = app.buildAction("/foo/bar/\\d", "foo.bar");
  asserts.same(res.controller, foo_bar_cb, "controller correct")
  asserts.same(res.__matcher, /^\/foo\/bar\/\d$/, "action's matcher correct");
  asserts.same(res.render, "foo/bar", "action template inferred");

  qmock.verifyOk( app );
})

exports.test_custom_matcher = setup(function(app) {
  var cb = function() { },
      m = function() { return false };

  var res = app.buildAction( "/foo", { controller: cb, __matcher: m } );

  asserts.same(res.__matcher, m, "action's custom matcher preserved");

  asserts.throwsOk(
    function() { app.buildAction( "/foo", { controller: cb, __matcher: "not a func" } ) },
    "TypeError: action.__matcher is not a function",
    "__matcher must be a function");
})

exports.test_static_action = setup(function test( app ) {
  var url = "/foo",
      act = { static: "bar" },
      ret = { return: "value" };

  app.expects(1).method("buildStaticAction")
                .interface( { accepts: [act, url], returns: ret } );

  var res = app.buildAction( "/foo", { static: "bar" } );

  qmock.verifyOk( app, "static action built ok" );
  asserts.same(res, ret, "... and returned");

})

exports.test_subapp_action = setup(function test( app ) {
  var url = "/foo",
      act = { app: "bar" },
      ret = { return: "value" };

  app.expects(1).method("buildSubappAction")
                .interface( { accepts: [act, url], returns: ret } );

  var res = app.buildAction( "/foo", { app: "bar" } );

  qmock.verifyOk( app, "subapp action built ok" );
  asserts.same(res, ret, "... and returned");
})

if (require.main == module)
  test.runner(exports);
