exports.Headers = require('http/headers').Headers;

/**
 *  Juice.Utils.bestMimeType( types, mediaRange ) -> String
 *  - types (Array): possible MIME types
 *  - mediaRange (String): list of MIME types with q scores i.e. an Accept HTTP
 *    header
 *
 *  Parses a content negotiation header `mediaRange` and returns the best matching MIME type
 *  from within `types`.
 *
 *  For example:
 *
 *      bestMimeType(
 *        ['application/xbel+xml', 'text/xml'],
 *        'text/*;q=0.5,*\/*; q=0.1'
 *      );
 *
 *  would return `"text/xml"`.
 **/
exports.bestMimeType = function( types, mediaRange ) {
  return require('./utils/mime').bestMatch( types, String(mediaRange) );
}


exports.alias = function alias(from_obj, from_name, to_obj, to_name ) {

  Object.defineProperty(to_obj, to_name, {
    enumerable: false,
    configurable: true,
    getter: function() {
      return from_obj[ from_name ];
    },
    setter: function( x ) {
      return from_obj[ from_name ] = x;
    }
  });
}

function compat_alias(obj, display, old_name, new_name ) {
  if ( old_name === undefined )
    old_name = display.replace( /^.*[.#]/, '' );
  else
    display += old_name;

  if ( new_name === undefined ) {
    // Not passed, guess it
    new_name = old_name.replace( /([a-z])([A-Z]+)/g,
      function(all, l1, l2) { return l1 + "_" + l2.toLowerCase() }
    )
  }

  //print("aliasing", old_name, "to", new_name);
  Object.defineProperty(obj, old_name, {
    enumerable: false,
    configurable: true,
    getter: function() {
      //require('system').stderr.print("deprecated setter:", old_name);
      exports.deprecation_warning( display, "0.3", new_name);
      return obj[ new_name ];
    },
    setter: function( x ) {
      exports.deprecation_warning( display, "0.3", new_name);
      return obj[ new_name ] = x;
    }
  });
}
exports.compat_alias = compat_alias;

// Spidermonkey version
exports.get_caller = function( uplevel ) {
  if ( uplevel === undefined)
    uplevel = 1;

  // Remove ourselves, and the Error ctor from the stack.
  uplevel += 2;

  var e = exports.split_error_stack( (new Error).stack )
                 .slice( uplevel, uplevel + 1 );

  if ( !e || !e.length)
    return "unknown";

  e = e[ 0 ];
  // Return the object, but give it a nice default stringification.
  e.toString = function() {
    return this.fileName + ":" + this.lineNumber;
  }
  return e
}
compat_alias(exports, "juice.Utils.", "getCaller");

exports.deprecation_warning = function( stream, name, removed_in, new_name ) {
  if ( arguments.length <= 2 ) {
    removed_in = name;
    name = stream;
    stream = require('system').stderr;
  }
  else if ( arguments.length <= 3 ) {
    new_name = removed_in;
    removed_in = name;
    name = stream;
    stream = require('system').stderr;
  }

  var msg;

  if (new_name !== void 0)
    msg = name + " will be removed in v" + removed_in + ". Use " + new_name + " instead\n";
  else
    msg = name + " is deprecated and will be removed in v" + removed_in  + "\n";

  stream.print( msg + " - called from " + exports.get_caller( 2 ) );
}
compat_alias(exports, "juice.Utils.", "deprecationWarning");

// Spidermonkey version
exports.split_error_stack = function(stack) {

  var lines = stack.split(/\n/);

  return lines.map(function(l) {
    let match = /^(.*?)@(.*?):(\d+)$/.exec(l);

    if (!match)
      return { fileName: l, function: '[unknown]' };

    let [whole, func, file, line] = match;

    return { function: func || '[main]', fileName: file, lineNumber: line };
  });
}
compat_alias(exports, "juice.Utils.", "splitErrorStack");

exports.split_query_string = function(qs) {
  if (!qs || qs.length == 0)
    return {};

  var param_obj = {};
  for each (let p in qs.split(/&/)) {
    let [k,v] = p.replace('+', ' ', 'g').split(/=/).map( decodeURIComponent );
    if ( ( k in param_obj) == false )
      param_obj[k] = new Array(0);

    param_obj[k].push( v )
  }
  return param_obj;
}
compat_alias(exports, "juice.Utils.", "splitQueryString");


const days   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
                'Oct', 'Nov', 'Dec'];
exports.format_http_date = function(when) {
  var day = when.getUTCDate();
  if (day < 10) day = '0' + day;

  return [
    days[when.getUTCDay()] + ',',
    day,
    months[when.getUTCMonth()],
    when.getUTCFullYear(),
    [when.getUTCHours(), when.getUTCMinutes(), when.getUTCSeconds()].join(':'),
    'GMT'
  ].join(' ');
}
compat_alias(exports, "Juice.Utils.", "formatHTTPDate", "format_http_date")

var clone = exports.clone = function(obj, deep) {
  // A clone of an object is an empty object
  // with a prototype reference to the original.

  // a private constructor, used only by this one clone.
  function Clone() { }
  Clone.prototype = obj;

  if (!deep)
    return new Clone()

  var c = new Clone();

  for (var i in obj) {
    if (obj.hasOwnProperty(i) && typeof obj[i] == 'object')
      c[i] = clone(obj[i], true);
  }
  return c;
}

exports.beautify = require('./beautify').beautify;
exports.beauty_uneval = function(x) {
  return exports.beautify( uneval(x), {
    space_after_anon_function: false

  } );
}
