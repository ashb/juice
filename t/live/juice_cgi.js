
var cgi = require('juice/engine/cgi');

function application(env) {
  return [
    200,
    {contentType: 'text/html'},
    function() {
      yield "Hi!";
      yield "<h2>Title</h2>";
      yield "<b>Hi!</b>";
      yield "<pre>Script url args are " + env.PATH_INFO + "</pre>";
      yield "<pre>This script is rooted at " + env.SCRIPT_NAME + "</pre>";
      yield "<h2>Title \u2603</h2>";
    }
  ];
}

cgi.run(application);
