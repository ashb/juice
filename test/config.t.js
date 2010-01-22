const test = require('test'),
      asserts = test.asserts,
      qmock = require('./lib/juice-test');

function setup(test) {
  return function() {
    var app = qmock.mock_app( module, "loadConfig" );
    app.docRoot = "root/";
    return test( app );
  }
}

exports.test_config = qmock.mockForTest(
  function mock() {

    qmock.mockModule( "fs-base",
      require( './lib/fs-mock' ).mock( {
        "conf/conf.json": '{ "foo": "bar" }',
        "conf/x.json": '[ "fine" ]',
      } )
    )
  },
  setup( function test( app ) {
    app.confDir = "conf/";
    app.loadConfig();

    asserts.same(
      app.config, 
      { foo: "bar", x: [ "fine" ]  }, 
      "config loaded"
    );

  })
);

exports.test_invalid_hierarchy = qmock.mockForTest(
  function mock() {

    qmock.mockModule( "fs-base",
      require( './lib/fs-mock' ).mock( {
        "conf/conf.json": '{ "foo": "bar" }',
        "conf/foo.json": '{ "should": "cause an error" }',
      } )
    )
  },
  setup( function test( app ) {
    app.confDir = "conf/";

    try {
      app.loadConfig();
      asserts.ok(0, " config hierarchy threw an error");
    }
    catch (e) {
      asserts.matches(
        e,
        /hierarchy error - sub config 'foo' /, 
        "invalid config hierarchy threw an error"
      );
    }


  })
);


if (require.main == module)
  test.runner(exports);
