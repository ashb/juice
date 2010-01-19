exports.Headers = require('http/headers').Headers;

// Spidermonkey version
exports.getCaller = function( uplevel ) {
  if ( uplevel === undefined)
    uplevel = 1;

  // Remove ourselves, and the Error ctor from the stack.
  uplevel += 2;

  var e = exports.splitErrorStack( (new Error).stack )
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

exports.deprecationWarning = function( stream, name, removed_in ) {
  if ( arguments.length <= 2 ) {
    removed_in = name;
    name = stream;
    stream = require('system').stderr;
  }

  stream.print( name + " is deprecated and will be removed in v" + removed_in  + "\n" +
                " - called from " + exports.getCaller( 2 ) );
}

// Spidermonkey version
exports.splitErrorStack = function(stack) {

  var lines = stack.split(/\n/);

  return lines.map(function(l) {
    let match = /^(.*?)@(.*?):(\d+)$/.exec(l);

    if (!match)
      return { fileName: l, function: '[unknown]' };

    let [whole, func, file, line] = match;

    return { function: func || '[main]', fileName: file, lineNumber: line };
  });
}

exports.splitQueryString = function(qs) {
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


const days   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
                'Oct', 'Nov', 'Dec'];
exports.formatHTTPDate = function(when) {
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
