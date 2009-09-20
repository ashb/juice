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
