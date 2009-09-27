exports.Headers = require('http/headers').Headers;

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
    let [k,v] = p.split(/=/).map( decodeURIComponent );
    if ( ( k in param_obj) == false )
      param_obj[k] = new Array(0);

    param_obj[k].push( v )
  }
  return param_obj;
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
