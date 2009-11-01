let test = require('test'),
    asserts = test.asserts,
    Context = require('../lib/juice/context').Context,
    Mock = require('qmock').Mock;

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
    Context.prototype.renderTemplate.call( app, "index", { planet : "world" } ),
    renderedTemplate,
    "Should default to .tt when there's no conf"
  );
}

if (require.main == module)
  test.runner(exports);
