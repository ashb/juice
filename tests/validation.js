let test = require('test'),
    asserts = test.asserts,
    v =  require('juice/validation').Validation.prototype.validators;

if (!this.exports) this.exports = {};

exports.test_Trim = function () {
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
  asserts.same( v.notEmpty( undefined ), undefined, "|undefined| should fail" );
  asserts.same( v.notEmpty( "" ), undefined, "Empty string should fail" );
  asserts.same( v.notEmpty( "foo" ), "foo", "Non-empty strings should return a string" );
  asserts.same( v.notEmpty( 123 ), 123, "Integers should be unchanged" );
  asserts.same( v.notEmpty( 123.456 ), 123.456, "Floats should be unchanged" );
}

exports.test_Integer = function () {
  asserts.same( v.integer( undefined ), undefined, "|undefined| should fail" );
  asserts.same( v.integer( "" ), "", "Empty string should pass" );
  asserts.same( v.integer( "foo" ), undefined, "Non-numeric string should fail" );
  asserts.same( v.integer( "123foo" ), undefined, "Mixed string should fail" );
  asserts.same( v.integer( "123" ), 123, "Simple numeric string should return a number" );
  asserts.same( v.integer( "123.456" ), undefined, "Numeric string with decimal point should fail" );
  asserts.same( v.integer( 123 ), 123, "Integers should be unchanged" );
  asserts.same( v.integer( 123.456 ), undefined, "Floats should fail" );
}

// 0 is neither positive nor negative
exports.test_Positive = function () {
  asserts.same( v.positive( -123 ), undefined, "Negative integers should fail" );
  asserts.same( v.positive( -123.456 ), undefined, "Negative floats should fail" );
  asserts.same( v.positive( 0 ), undefined, "Zero should fail" );
  asserts.same( v.positive( 123 ), 123, "Positive integers should pass" );
  asserts.same( v.positive( 123.456 ), 123.456, "Positive floats should pass" );
}

if (require.main == module)
  test.runner(exports);

