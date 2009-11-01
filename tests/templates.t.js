let test = require('test'),
    asserts = test.asserts,
    Context = require('../lib/juice/context').Context,
    Mock = require('qmock').Mock;

// simple wrapper for testing throws
asserts.throws = function( testcase, expected, message ) {
  if ( message == undefined ) {
    message = expected;
    expected = undefined;
  }
  try {
    testcase();
    asserts.ok( 0, message );
    asserts.diag( "No error thrown" );
  }
  catch ( e ) {
    if ( expected === undefined || expected == e.toString() ) {
      asserts.ok( 1, message );
    }
    else {
      asserts.ok( 0, message );
      asserts.diag( "   Got: " + e.toString() );
      asserts.diag( "Wanted: " + expected );
    }
  }
}

if (!this.exports) this.exports = {};

exports.test_RenderTemplateDefault = function() {
  var rawTemplate = "foo",
      stash = { foo : "bar" },
      renderedTemplate = "bar";

  var file = new Mock();
  file.expects()
    .method( "readWhole" )
    .andReturn( rawTemplate );

  var fs = new Mock();
  fs.expects()
    .method( "isFile" )
    .withArguments( "templates/index.tt" )
    .andReturn( true );
  fs.expects()
    .method( "rawOpen" )
    .withArguments( "templates/index.tt" )
    .andReturn( file );

  // Flusspferd specific
  require.module_cache[ 'filesystem-base' ] = fs;

  var app = new Mock();
  app.expects()
    .method( "config" )
    .withArguments( "templates" )
    .andReturn( undefined );
  app.docRoot = "";

  var tt = new Mock();
  tt.expects()
    .method( "render" )
    .withArguments( rawTemplate, stash )
    .andReturn( renderedTemplate );

  // Flusspferd specific
  require.module_cache[ 'Template' ] = tt;

  asserts.same(
    Context.prototype.renderTemplate.call( app, "index", stash ),
    renderedTemplate,
    "Should default to .tt when there's no conf"
  );
}

exports.test_RenderTemplateNotFound = function() {
  var rawTemplate = "foo",
      stash = { foo : "bar" },
      renderedTemplate = "bar";

  var fs = new Mock();
  fs.expects()
    .method( "isFile" )
    .withArguments( "templates/index.tt" )
    .andReturn( false );

  // Flusspferd specific
  require.module_cache[ 'filesystem-base' ] = fs;

  var app = new Mock();
  app.expects()
    .method( "config" )
    .withArguments( "templates" )
    .andReturn( { "tt" : "Template" } );
  app.docRoot = "";

  var tt = new Mock();
  tt.expects()
    .method( "render" )
    .withArguments( rawTemplate, stash )
    .andReturn( renderedTemplate );

  // Flusspferd specific
  require.module_cache[ 'Template' ] = tt;

  asserts.throws(
    function() { Context.prototype.renderTemplate.call( app, "index", stash ); },
    "Should throw an error if no template file exists"
  );
}

if (require.main == module)
  test.runner(exports);
