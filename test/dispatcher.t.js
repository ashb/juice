const test = require('test'),
      asserts = test.asserts,
      Context = require('juice').Context,
      qmock = require('./lib/qmock');

// TEST:
//   Check the dispatcher works as intended

var app;

function setup( test ) {
  return function() {
    var context = qmock.Mock();
    context.runAction = Context.prototype.runAction;
    context.response = {};
    return test( context );
  }
}

exports.test_params_decoded = setup( function( context ) {
  var action = {
    action : function( one, two ) {
      asserts.same( one, "a+b", "doesn't decode +" );
      asserts.same( two, "c d", "decodes %20" );
    },
    raw : true
  };

  context.runAction( [ "a+b", "c%20d" ], action );
})

exports.test_raw_response = setup( function( context ) {
  var response = "foo",
      action = {
        action : function() { return response; },
        raw : true
      };

  asserts.same( context.runAction( [], action ), response, "passes response back untouched" );
} );

exports.test_json_response = setup( function( context ) {
  var json = { foo : 1, bar : 2 },
      action = { action : function() { return json; } };

  context.format = "json";
  var response = context.runAction( [], action );

  asserts.same( response.body, [ json.toSource() ], "body is toSourced json" );
  asserts.same( response.status, 200, "status defaults to 200" );
  asserts.same( response.headers.contentType, "application/json", "contentType correct" );
} );

exports.test_action_redirect = setup( function( context ) {
  var path = "/foo",
      target = "http://site.com/foo",
      action = {
        action : function() { return "body"; },
        redirect : path
      };

  context.expects( 1 ).method( "urlFor" )
         .interface( { accepts : [ path ], returns : target } );
  var response = context.runAction( [], action );

  asserts.same( response.body, [], "body is empty" );
  asserts.same( response.status, 302, "status defaults to 302" );
  asserts.same( response.headers.location, target );
  qmock.verifyOk( context, "urlFor called correctly" );
} );

exports.test_no_resolution = setup( function( context ) {
  var action = { action : function() {} };

  asserts.throwsOk( function() { context.runAction( [], action ); },
                    "lack of template or redirect should cause an error" );
} );

exports.test_template_rendered = setup( function( context ) {
  var data = { foo : 1, bar : 2 },
      template = "template.tt",
      action = {
        action : function() { return data; },
        render : template
      },
      output = "one two three",
      helpers = { alpha : function() {} };

  context.helpers = helpers;
  context.urlFor = function() {};
  var renderTemplate = context.expects( 1 ).method( "renderTemplate" )
    .interface( { accepts : [ template, data ], returns : output } );

  var response = context.runAction( [], action );
  asserts.same( response.body, [ output ], "returns correct output" );
  asserts.same( response.headers.contentType, "text/html", "correct content type" );
  asserts.same( response.status, 200, "status defaults to 200" );
  qmock.verifyOk( context, "renderTemplate called correctly" );
  asserts.same( data.juice, helpers, "helpers inserted into data" );

  // make output undefined instead
  renderTemplate.interface( { accepts : [ template, data ], returns : undefined } );
  asserts.throwsOk( function() { context.runAction( [], action ); },
                    "failure to render should throw an error" );
} );

if (require.main == module)
  test.runner(exports);
