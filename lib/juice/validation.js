var Validation = function(spec, lang) {
  this.spec = spec;
  this.lang = lang || 'en';
};

exports.Validation = Validation;

Validation.prototype.validators = {
  trim : function( x ) { return typeof x == "string" ? ( x.toString() || "" ).replace( /^\s+|\s+$/g, "" ) : x; },
  notEmpty : function( x ) {
    if ( typeof x != "undefined" && x.toString().length > 0 ) return x;
    else throw x; },
  integer : function( x ) {
    if ( x === undefined || x === "" ) return x;
    if ( isNaN( x ) ) throw undefined;
    if ( parseInt( x ).toString() !== x.toString() ) throw undefined;
    else return parseInt( x ); },
  positive : function( x ) {
    if ( x === undefined || x === "" ) return x;
    if ( x > 0 ) return x;
    else throw undefined; }
};

// this won't work right on client-side unless they fill data into the spec first
Validation.prototype.validate = function( ) {
  var success = true;
  for ( var field in this.spec ) {
    var data = this.spec[ field ];
    try {
      data.value = this.validateField( data, data.value );
    }
    catch ( e ) {
      success = false;
      data.error = e.toString();
    }
  }

  return { valid: success, fields: this.spec };
}

Validation.prototype.validateField = function(spec, value) {
  var error;
  for ( var k in spec.validation ) {
    var test = spec.validation[k]
    try {
      // TODO: handle async AJAX calls
      value = this.validators[ test ]( value );
    }
    catch (e) {
      value = undefined;

      if ( spec.message ) throw spec.message;
      else if ( spec.messages && spec.messages[ test ] ) throw spec.messages[ test ];
      else if ( test in Validation.messages[this.lang]) throw Validation.messages[this.lang][ test ];
      else throw test;
    }
  }
  return value;
}

Validation.messages = {
  en: {
    notEmpty: "{label} is a required field",
    integer: "{label} must be a whole number",
    positive: "{label} must be greater than zero",
    email: "{label} must be a valid email address"
  }
}

