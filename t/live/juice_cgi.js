
var cgi = require('juice/engine/cgi');

function application(env) {
  return [
    200,
    {contentType: 'text/html'},
    function() {
      yield "Hi!";
      yield "<h2>Title</h2>";
    }
  ];
}

cgi.run(application);
