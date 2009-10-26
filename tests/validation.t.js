let test = require('test'),
    asserts = test.asserts,
    Validation = require('juice/validation').Validation;

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

exports.test_Trim = function () {
  var v = Validation.prototype.validators;
  asserts.same( v.trim( undefined ), undefined, "|undefined| should stay the same" );
  asserts.same( v.trim( "" ), "", "Empty string should stay the same" );
  asserts.same( v.trim( " \t " ), "", "Pure whitespace should result in an empty string" );
  asserts.same( v.trim( " \t foo" ), "foo", "Leading whitespace should be trimmed" );
  asserts.same( v.trim( "foo \t " ), "foo", "Trailing whitespace should be trimmed" );
  asserts.same( v.trim( "foo \t bar" ), "foo \t bar", "Internal whitespace should not be trimmed" );
  asserts.same( v.trim( " \t foo \t bar \t " ), "foo \t bar", "Everything at once should work" );
  asserts.same( v.trim( 123 ), 123, "Numbers should be unchanged" );
}

// Should this handle anything more than strings and numbers?
exports.test_NotEmpty = function() {
  var v = Validation.prototype.validators;
  asserts.throws( function() { v.notEmpty( undefined ); }, "|undefined| should fail" );
  asserts.throws( function() { v.notEmpty( "" ); }, "Empty string should fail" );
  asserts.same( v.notEmpty( "foo" ), "foo", "Non-empty strings should return a string" );
  asserts.same( v.notEmpty( 123 ), 123, "Integers should be unchanged" );
  asserts.same( v.notEmpty( 123.456 ), 123.456, "Floats should be unchanged" );
}

exports.test_Integer = function () {
  var v = Validation.prototype.validators;
  asserts.same( v.integer( undefined ), undefined, "|undefined| should pass" );
  asserts.same( v.integer( "" ), "", "Empty string should pass" );
  asserts.throws( function() { v.integer( "foo" ); }, "Non-numeric string should fail" );
  asserts.throws( function() { v.integer( "123foo" ); }, "Mixed string should fail" );
  asserts.same( v.integer( "123" ), 123, "Simple numeric string should return a number" );
  asserts.throws( function() { v.integer( "123.456" ); }, "Numeric string with decimal point should fail" );
  asserts.same( v.integer( 123 ), 123, "Integers should be unchanged" );
  asserts.throws( function() { v.integer( 123.456 ); }, "Floats should fail" );
}

// 0 is neither positive nor negative
exports.test_Positive = function () {
  var v = Validation.prototype.validators;
  asserts.same( v.positive( undefined ), undefined, "|undefined| should pass" );
  asserts.same( v.positive( "" ), "", "Empty string should pass" );
  asserts.throws( function() { v.positive( -123 ); }, "Negative integers should fail" );
  asserts.throws( function() { v.positive( -123.456 ); }, "Negative floats should fail" );
  asserts.throws( function() { v.positive( 0 ); }, "Zero should fail" );
  asserts.same( v.positive( 123 ), 123, "Positive integers should pass" );
  asserts.same( v.positive( 123.456 ), 123.456, "Positive floats should pass" );
}

exports.test_ValidateFieldChaining = function () {
  var v = new Validation();
  var chained = { validation : [ "trim", "notEmpty", "integer", "positive" ] };
  asserts.throws( function() { v.validateField( chained, "" ); }, "Empty field should throw error" );
  asserts.throws( function() { v.validateField( chained, "  " ); }, "Whitespace only should throw error" );
  asserts.throws( function() { v.validateField( chained, "foo" ); }, "Non integer should throw error" );
  asserts.throws( function() { v.validateField( chained, "-123" ); }, "Negative integer should throw an error" );
  asserts.same( v.validateField( chained, "123" ), 123, "Positive integer should be parsed into a number" );
  asserts.same( v.validateField( chained, " 123 " ), 123, "Positive integer with trimmable whitespace should be parsed into a number" );
}

exports.test_ValidateFieldMessages = function () {
  Validation.messages.test = {};
  var v = new Validation( undefined, "test" ); // language is "test" for error messages

  // |message| present
  var one_message = {
    validation : [ "trim", "notEmpty", "integer" ],
    message : "one message"
  };
  asserts.throws( function() { v.validateField( one_message, "" ); },
                  "one message",
                  "All errors should throw single message" );
  asserts.throws( function() { v.validateField( one_message, " " ); },
                  "one message",
                  "All errors should throw single message" );
  asserts.throws( function() { v.validateField( one_message, "foo" ); },
                  "one message",
                  "All errors should throw single message" );

  // |messages| present
  var many_messages = {
    validation : [ "trim", "notEmpty", "integer" ],
    messages : {
      "notEmpty" : "message for notEmpty",
      "integer" : "message for integer"
    }
  };
  asserts.throws( function() { v.validateField( many_messages, "" ); },
                  "message for notEmpty",
                  "notEmpty should throw its given message" );
  asserts.throws( function() { v.validateField( many_messages, " " ); },
                  "message for notEmpty",
                  "notEmpty should throw its given message" );
  asserts.throws( function() { v.validateField( many_messages, "foo" ); },
                  "message for integer",
                  "integer should throw its given message" );

  // neither |message| nor |messages| present
  var no_messages = {
    validation : [ "trim", "notEmpty", "integer" ]
  };
  asserts.throws( function() { v.validateField( no_messages, "" ); },
                  "notEmpty",
                  "notEmpty should throw its name" );
  asserts.throws( function() { v.validateField( no_messages, " " ); },
                  "notEmpty",
                  "notEmpty should throw its name" );
  asserts.throws( function() { v.validateField( no_messages, "foo" ); },
                  "integer",
                  "integer should throw its name" );

  // default messages
  Validation.messages.test = {
    "notEmpty" : "default for notEmpty",
    "integer" : "default for integer"
  };
  asserts.throws( function() { v.validateField( no_messages, "" ); },
                  "default for notEmpty",
                  "notEmpty should throw it's default message" );
  asserts.throws( function() { v.validateField( no_messages, " " ); },
                  "default for notEmpty",
                  "notEmpty should throw it's default message" );
  asserts.throws( function() { v.validateField( no_messages, "foo" ); },
                  "default for integer",
                  "integer should throw it's default message" );
}

if (require.main == module)
  test.runner(exports);

