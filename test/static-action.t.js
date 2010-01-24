const test = require('test'),
      asserts = test.asserts,
      qmock = require('./lib/juice-test');

exports.test_build = qmock.mockForTest(
  function mock() {
    qmock.mockModule( "fs-base",
      require( './lib/fs-mock' ).mock( {
        "root/styles/app.css": '* { color: white }'
      } )
    )
  },
  function test() {
    var app = qmock.mock_app( module, "buildStaticAction" ),
        action = app.buildStaticAction(
          { static: "styles" },
          "/styles"
        );
    asserts.ok( action.__matcher, "Looks like an action" );
    asserts.ok( action.controller, "Looks like an action" );

    // TODO: test action.controller behaviour somehow
    // TODO: test action.__matcher behaviour somehow
  }
);

// TODO: Do we actually want this behaviour?
exports.test_nonexistent = qmock.mockForTest(
  function mock() {
    qmock.mockModule( "fs-base",
      require( './lib/fs-mock' ).mock( { } )
    )
  },
  function test() {
    require('fs-base').exists._getState()
      .atLeast(1)
      .noMoreThan(1);

    var app = qmock.mock_app( module, "buildStaticAction" );
    asserts.throwsOk(
      function() {
        app.buildStaticAction( { static: "/foo" }, "/styles" )
      },
      "buildStatic throws if path doesn't exist"
    );


    qmock.verifyOk( require('fs-base'), "fs-base mocked ok" );
  }
);

if (require.main == module)
  test.runner(exports);

