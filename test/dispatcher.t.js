const test = require('test'),
      asserts = test.asserts,
      qmock = require('./lib/juice-test'),
      test_context = qmock.test_context;

// TEST:
//   Check the dispatcher works as intended


exports.test_action_invocant = test_context( function test( context ) {
  var action = {
    action : function( ) {
      asserts.same( this, context, "action called with Juice.Context instance as invocant" );
    },
    raw : true
  };

  context.runAction( [], action );
})


exports.test_params_decoded = test_context( function test( context ) {
  var action = {
    action : function( one, two ) {
      asserts.same( one, "a+b", "doesn't decode +" );
      asserts.same( two, "c d", "decodes %20" );
    },
    raw : true
  };

  context.runAction( [ "a+b", "c%20d" ], action );
})

exports.test_raw_response = test_context( function test( context ) {
  var response = "foo",
      action = {
        action : function() { return response; },
        raw : true
      };

  asserts.same( context.runAction( [], action ), response, "passes response back untouched" );
} );

exports.test_json_response = test_context( function test( context ) {
  var json = { foo : 1, bar : 2 },
      action = { action : function() { return json; } };

  context.format = "json";
  var response = context.runAction( [], action );

  asserts.same( JSON.parse( String(response.body) ) , json, "body is toSourced json" );
  asserts.same( response.status, 200, "status defaults to 200" );
  asserts.same( response.headers.contentType, "application/json", "contentType correct" );
} );

exports.test_action_redirect = test_context( function( context ) {
  var path = "/foo",
      target = "http://site.com/foo",
      action = {
        action : function() { return "body"; },
        redirect : path
      };

  delete context.absUrlFor;
  context.expects( 1 ).method( "absUrlFor" )
         .interface( { accepts : [ path ], returns : target } );

  var response = context.runAction( [], action );

  asserts.same( response.body, [], "body is empty" );
  asserts.same( response.status, 302, "status defaults to 302" );
  asserts.same( response.headers.location, target );
  qmock.verifyOk( context, "urlFor called correctly" );
} );

exports.test_response_redirect = test_context( function( context ) {
  var path = "/foo",
      target = "http://site.com/foo",
      action = {
        action : function() {
          this.res.redirect( "/foo", 307 );
        },
      };

  delete context.absUrlFor;
  context.expects( 1 ).method( "absUrlFor" )
         .interface( { accepts : [ path ], returns : target } );

  var response = context.runAction( [], action );

  asserts.same( response.body, [], "body is empty" );
  asserts.same( response.status, 307, "status defaults to 307" );
  asserts.same( response.headers.location, target );
  qmock.verifyOk( context, "urlFor called correctly" );
} );

exports.test_no_resolution = test_context( function( context ) {
  var action = { action : function() {} };

  // TODO: check the error in more detail
  asserts.throwsOk( function() { context.runAction( [], action ); },
                    "lack of template or redirect should cause an error" );
} );

exports.test_template_rendered = test_context( function( context ) {
  var data = { foo : 1, bar : 2 },
      template = "template.tt",
      action = {
        action : function() { return data; },
        render : template
      },
      output = "one two three",
      helpers = { alpha : function() {} };

  context.helpers = helpers;

  delete context.renderTemplate;
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

// Test that setting this.res.template changes which one is rendered
exports.test_template_override = test_context( function( context ) {
  var data = { foo : 1, bar : 2 },
      action = {
        action : function() {
          this.res.template = "template2.tt";
          return data;
        },
        render : "template.tt"
      },
      output = "one two three",
      helpers = { alpha : function() {} };

  context.helpers = helpers;

  delete context.renderTemplate;
  var renderTemplate = context.expects( 1 ).method( "renderTemplate" )
    .interface( { accepts : [ "template2.tt", data ], returns : output } );

  // We don't care about anything but the template name in this test.
  context.runAction( [], action );
  qmock.verifyOk( context, "renderTemplate called correctly" );

  // make output undefined instead - make sure its really not using action.render
  renderTemplate.interface(
    { accepts : [ "template2.tt", data ], returns : undefined },
    { accepts : [ "template.tt", data ], returns : output }
  );
  asserts.throwsOk( function() { context.runAction( [], action ); },
                    "failure to render should throw an error" );
} );

if (require.main == module)
  test.runner(exports);
