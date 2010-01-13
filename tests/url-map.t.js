const test = require('test'),
      asserts = test.asserts,
      App = require('juice').Application,
      qmock = require('./lib/qmock');

// TEST:
//   Check that buildAction behaves as expected for various different cases

function setup(test) {
  var app = qmock.Mocks();
  App.call(app);
  app.buildAction = App.prototype.buildAction;

  return function() {
    return test(app) ;
  }
}

exports.test_inline_action = setup(function(app) {
  var cb = function() { },
      res = app.buildAction( "/foo", cb );

  asserts.same(res.action, cb, "action correct for literal function '/foo'")
  asserts.same(res.__matcher, /^\/foo$/, "action's matcher correct");
  // TODO: rename this to template or default_template
  asserts.same("render" in res, false, "action template not inferred for function actions");

  res = app.buildAction( "/foo/bar", { action: cb } );
  asserts.same(res.action, cb, "action correct for action hash '/foo/bar'")
  asserts.same(res.__matcher, /^\/foo\/bar$/, "action's matcher correct");
  asserts.same("render" in res, false, "action template not inferred for function actions");
})

exports.test_named_action = setup(function(app) {
  var foo_cb = function() { },
      foo_bar_cb = function() { };

  // The qmock API is a little bit batty. Or lacking docks. one or the other
  // You cant throw an error from a mocked method it seems.
  var getController = app.expects().method("getAction");
  getController.expectedArgs = [
    { accepts: [{}, "foo"], returns: foo_cb },
    { accepts: [{}, "foo.bar"], returns: foo_bar_cb }
  ];

  var res = app.buildAction("/foo", "foo");
  asserts.same(res.action, foo_cb, "action correct '/foo'")
  asserts.same(res.__matcher, /^\/foo$/, "action's matcher correct");
  asserts.same(res.render, "foo", "action template inferred");

  var res = app.buildAction("/foo/bar/\\d", "foo.bar");
  asserts.same(res.action, foo_bar_cb, "action correct")
  asserts.same(res.__matcher, /^\/foo\/bar\/\d$/, "action's matcher correct");
  asserts.same(res.render, "foo/bar", "action template inferred");
})

if (require.main == module)
  test.runner(exports);
