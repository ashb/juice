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
