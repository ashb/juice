i = new Importer();
i.context = this;
i.paths.unshift('lib');
import = Function.bind(i, 'load');
warn = Function.bind(IO.stderr, 'print');

import('juice.engine.cgi');
import('juice.application');

var app = new Juice.Application;

app.do_index = function do_index(req, res) {
  IO.stderr.print("in do_index");
  res.content = req.headers;
  res.contentType = 'text/plain';
}

app.urlpatterns = [
  ['/', app.do_index]
];

var engine = new Juice.Engine.CGI();
engine.register_application('http://localhost:9090/a', app)

engine.run();
