var juice = require('juice'),
    system = require('system');

var CGI = exports;
CGI.run = function run(application) {

  var env = CGI.buildEnv(system.env);

  let res;
  try {
    res = application(env);
    // This is currently broken in flusspferd
    /*if (res instanceof Array == false)
      throw TypeError("res is not an array")*/
  }
  catch (e) {
    res = CGI.handleError(e);
  }

  CGI.sendResponse(res);
  
}

CGI.buildEnv = function buildEnv(input) {
  // Helper functions
    // Fix up header names from CGI
    function fixHeaderName(n) {
      return n.replace(/^HTTP_/, '')
              .toLowerCase()
              .replace(/_/g, '-');
    }


  // Turn the CGI environment into the JSGI one.

  var env = {
    jsgi: {
      version: [0,3],
      errors: system.stderr,
      multithread: false,
      multiprocess: false,
      runonce: false
    },
    headers: {},
    body: system.stdin,
    scheme: 'http',
    serverPort: system.env.SERVER_PORT
  }

  // Work out which version of CGI we are running under. Spec calls for any
  // 'truthy' value.
  var [, cgi_ver] = input.GATEWAY_INTERFACE.match(/^CGI\/([0-9.]+)$/) || [];
  env.jsgi.cgi = cgi_ver || true;

  // Populate the headers
  for (let[k,v] in Iterator(input)) {
    if (k.match(/^HTTP_|CONTENT|COOKIE/) )
      env.headers[fixHeaderName(k)] = v;
  }

  var env_map = {
    REQUEST_METHOD: 'requestMethod',
    QUERY_STRING:   'queryString',
    SCRIPT_NAME:    'scriptName',
    PATH_INFO:      'pathInfo'
  };

  for (let [cgi_n,jsgi_n] in Iterator(env_map) ) {
    if (cgi_n in input)
      env[jsgi_n] = input[cgi_n]
    else
      env[jsgi_n] = '';
  }

  // Spec says:
  //   Note, however, that .headers.host, if present, should be used in
  //   preference to serverName for reconstructing the request URL.
  [env.serverName, env.serverPort]
    = (input.HTTP_HOST || input.SERVER_NAME).split(/:/);
  env.serverPort = env.serverPort || 80;

  env.juice = {
    webserver: input.SERVER_SOFTWARE,
    docRoot: input.DOCUMENT_ROOT.replace(/\/?$/, '/')
  };

  //env.jsgi.errors.print(juice.Utils.beauty_uneval(input));

  return CGI._fixEnv(env, input);
}

CGI.sendResponse = function sendResponse(res) {
  if (typeof res != "object") {
    CGI.sendResponse(CGI.handleError("response is not an object"));
    return;
  }

  var { status: code, headers: headers, body: body } = res;

  if (code && parseInt(code) != code || code < 100) {
    CGI.sendResponse(CGI.handleError("invalid code"));
    return;
  }

  var hdrs = new juice.Utils.Headers(Iterator(headers));

  if (typeof body == "function") {
    //system.stderr.print("body is a function, calling");
    body = body();
  }

  var h_string = hdrs.toString();

  if (h_string.length)
    h_string += "\r\n"

  system.stdout.write("Status: " + code + "\r\n" +
                      h_string + "\r\n");

  // Work out what kind of body we have.

  if (body.next && body.send) {
    // Assume generator returns a single value. i.e.
    // function () { yield "Some content" }
    for (let i in body)
      CGI.outputChunk(i);
  }  
  else if (body instanceof Iterator) {
    for (let [_,i] in iter)
      CGI.outputChunk(i);
  }
  else if (typeof(body) == "string" || body instanceof String) {
    CGI.outputChunk(body);
  }
  else if (typeof body.forEach == "function") {
    body.forEach(CGI.outputChunk);
    if (typeof body.close == "function")
      body.close(CGI.outputChunk);
  }
  else
    throw new Error("body is not and iterator and has no forEach method");


}

CGI.outputChunk = function outputChunk(chunk) {
  system.stdout.write(chunk);
}

CGI.handleError = function handleError (err) {
  var body = err.toString();

  if (err.stack)
    body += "\n\nStack:\n" + err.stack;

  return {
    status: 500,
    headers: {'Content-Type': 'text/plain'},
    body: [body]
  };
}


CGI._fixEnv = function _fixEnv(env, origEnv) {
 
  var webserver = env.juice.webserver;
  if (!webserver)
    return env;

  if (webserver.match(/lighttpd/)) {
    if (env.pathInfo === undefined)
      env.pathInfo = '';
  }

  return env;
}
