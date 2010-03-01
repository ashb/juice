
var qmock = require('./qmock');
for (var i in qmock) {
  exports[ i ] = qmock[ i ];
}

exports.mockForTest = function( mocks, test ) {
  return function() {
    var mocks_to_remove = {};

    try {
      record_mocks = mocks_to_remove;
      exports.unloadJuice();
      mocks();
      return test();
    }
    finally {
      for ( var i in mocks_to_remove ) {
        // QMock has some bugs in mocked members with varying interfaces it seems
        // exports.verifyOk( mocks_to_remove[ i ], i + " mocked ok" );
        delete require.module_cache[ i ];
      }
    }
  }
}

var record_mocks = void 0;
// Flusspferd specific - mock up a module
exports.mockModule = function(module, api) {
  var mock;

  if (typeof api == "function")
    mock = api; // Already mock object. probably.
  else
    mock = new exports.Mock( api );

  var cache;
  if ( "exports" in require.module_cache.flusspferd )
       cache = { exports: mock };
  else cache = mock;

  require.module_cache[ module ] = cache;

  if (record_mocks)

    record_mocks[module] = mock;

  return mock;
}

// Flusspferd specific - unload all juice modules.
exports.unloadJuice = function() {
  for ( var i in require.module_cache ) {
    if ( i.match( /\bjuice\b/ ) && !i.match( /\btest\b/ ) ) {
      delete require.module_cache[i];
    }
  }
}

exports.verifyOk = function( mock, msg ) {
  const asserts = require('test').asserts;

  try {
    mock.verify();
    asserts.ok(true, msg || "mocked ok");
  }
  catch (e) {
    asserts.ok(false, msg || "mocked ok");
    asserts.diag( uneval( e ) );
  }

}

// Call with the module object of the test, and with the names of functions you
// wish copied from the App prototype:
//
//     var app = mock_app( module, "loadConfig" )
//
exports.mock_app = function( module ) {
  var app = exports.Mock();
  var App = require('juice').Application;
  // Call the constructor on the mock to setup member variables
  App.call(app, module);

  app.docRoot = "root/";
  // Copy methods we want to test from the prototype
  for (var i = 1; i < arguments.length; i++) {
    app[ arguments[ i ] ] = App.prototype[ arguments[ i ] ];
  }
  return app;
}


exports.test_context = function test_context(req, test) {
  if ( arguments.length == 1 && req instanceof Function ) {
    test = req;
    req = {};
  }

  // Sane defaults
  if ( "host" in req == false ) req.host = "localhost";
  if ( "port" in req == false ) req.post = "3000";
  if ( "scriptName" in req == false ) req.scriptName = "";
  if ( "pathInfo" in req == false ) req.pathInfo = "";
  if ( "headers" in req == false ) req.headers = [];
  if ( "scheme" in req == false ) req.scheme = "http";

  return function() {
    var app = req.app || exports.mock_app( module );

    var Ctx = require('juice').Context;

    var ctx = new exports.Mock();
    // this should probably be Object.create. Except its not very common yet.
    ctx.__proto__ = Ctx.prototype;

    // Call the constructors on the mock to setup member variables
    Ctx.call(ctx, app, req);

    return test(ctx);
  }
}
