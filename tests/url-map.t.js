const test = require('test'),
      asserts = test.asserts,
      App = require('juice').Application

// TEST:
//   Check that buildAction behaves as expected for various different cases

function setup(test) {
  var app = new App();
  return function() {
    return test(app) ;
  }
}

exports.test_inline_action = setup(function(app) {
  var cb = function() { },
      res = app.buildAction( "/foo", cb );

  asserts.same(res.action, cb, "action correct")
  asserts.same(res.__matcher, /^\/foo$/, "simple matcher regexp");
})

if (require.main == module)
  test.runner(exports);
