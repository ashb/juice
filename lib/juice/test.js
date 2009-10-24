
var test = exports.test = function juiceTest(app) {
  var juice = app.juiceApp;

  var oldBuildContext = juice.buildContext;
  juice.buildContext = function(request) {
    var ctx = oldBuildContext.call(juice, request);

    // When running the test app, we always want the raw output, never render it etc.
    ctx.runAction = function runTestAction(captures, action) {
      return action.action.apply(this, captures);
    }
    return ctx;
  }

  juice.notFound = function(request) {
    return "404 - not found";
  }


  var ret = {
    get: function(url) {
      return app(make_req(url, 'GET'));
    },

    post: function(url,body) {
      var req = make_req(url, 'POST');

      var blob = require('encodings').convertFromString('utf-8', body).toByteArray();

      req.headers['content-length'] = blob.length;
      // TODO: Support other encoding types
      req.headers['content-type'] = 'application/x-www-form-urlencoded';

      req.body.read = function(n) {
        return blob.splice(0,n);
      }

      return app(req);
    }
  };

  function make_req(url, method) {
    var [,path, query] = /^(.*?)(?:\?(.*?))?$/.exec(url);

    var req = {
      jsgi: {
        version: [0,3],
        errors: require('system').stderr
      },
      requestMethod: method,
      scriptName: '',
      pathInfo:  path,
      queryString: query,
      scheme: 'http',
      body: ({ read: function() { return null } }),
      serverName: 'localhost',
      serverPort: '3000',

      headers: {
        host: 'localhost:3000'
      }
    };
    return req;
  }

  return ret;
}
