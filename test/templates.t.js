let test = require('test'),
    asserts = test.asserts,
    Context = require('../lib/juice/context').Context,
    qmock = require('./lib/juice-test'),
    Mock = qmock.Mock;


function mock_view( app, opts ) {
  var tmpl = new Mock( {
    render : {
      calls: 1,
      interface : [
        { accepts : [
            opts.input || "raw-template",
            opts.stash || { key: "value" }
          ],
          returns : opts.returns || "rendered-template"
        }
      ]
    }
  } );

  tmpl.accepts( Object );

  app.expects(1)
     .method("loadRelativeComponent")
     .interface({
        accepts: [ "./view/" + opts.name ],
        returns: { View: tmpl }
      });
  return tmpl;
}

exports.test_RenderTemplateDefault = qmock.mockForTest(
function mock() {
  qmock.mockModule( 'fs-base',
    require( './lib/fs-mock' ).mock( {
      "templates/index.tt": "raw-template"
    } )
  );
},
function test() {
  var rawTemplate = "raw-template",
      stash = { key : "value" },
      renderedTemplate = "rendered-template";

  var app = qmock.mock_app( module );
  app.docRoot = "";
  app.config = { }
  app.templatePath = [ 'templates/' ];
  var tt = mock_view( app, { name: "tt" } );

  asserts.same(
    Context.prototype.renderTemplate.call( app, "index", stash ),
    "rendered-template",
    "Should default to .tt when there's no conf"
  );

  qmock.verifyOk( app );
  qmock.verifyOk( tt );
} );

exports.test_RenderTemplateNotFound = qmock.mockForTest(
function mock() {
  // Mock empty fs
  qmock.mockModule( 'fs-base',
    require( './lib/fs-mock' ).mock( { } )
  );
},
function test() {
  var rawTemplate = "raw-template",
      stash = { key : "value" },
      renderedTemplate = "rendered-template";

  var app = qmock.mock_app( module );
  app.docRoot = "";
  app.config = {};
  app.templatePath = [ app.docRoot + 'templates/' ];

  asserts.throwsOk(
    function() { Context.prototype.renderTemplate.call( app, "index", stash ); },
    "Should throw an error if no template file exists"
  );

  qmock.verifyOk( app );
} );

exports.test_RenderTemplateEngineNotFound = qmock.mockForTest(
function mock() {
  qmock.mockModule( 'fs-base',
    require( './lib/fs-mock' ).mock( {
      "templates/index.made-up": "raw-template"
    } )
  );
},
function test() {
  var rawTemplate = "raw-template",
      stash = { key : "value" },
      renderedTemplate = "rendered-template";

  var app = qmock.mock_app( module );
  app.docRoot = "";
  app.config = { templates: { "made-up": "made-up" } };
  app.templatePath = [ 'templates/' ];

  asserts.throwsOk(
    function() { Context.prototype.renderTemplate.call( app, "index", stash ) },
    "Should throw an error if the rendering engine doesn't exist"
  );
} );

exports.test_RenderTemplateOrder = qmock.mockForTest(
function mock() {
  qmock.mockModule( 'fs-base',
    require( './lib/fs-mock' ).mock( {
      "templates/index.haml": "raw-template"
    } )
  );
},
function test() {
  var stash = { key : "value" },
      renderedTemplate = "rendered-template";

  var app = qmock.mock_app( module );
  app.docRoot = "";
  app.config = { templates: { tt: "tt", haml: "haml" } };
  app.templatePath = [ app.docRoot + 'templates/' ];

  var haml = mock_view( app, { name: "haml" } );

  asserts.same(
    Context.prototype.renderTemplate.call( app, "index", stash ),
    renderedTemplate,
    "Should try the next option if the first doesn't exist"
  );

  qmock.verifyOk( app, "template adaptor loaded correctly" );
  qmock.verifyOk( haml, "template adaptor called correctly" );
} );

if (require.main == module)
  test.runner(exports);
