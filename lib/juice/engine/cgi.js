let Juice = require('juice'),
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
  // Turn the CGI environment into the JSGI one.

  var env = {
    'jsgi.version': [0,1],
    'jsgi.url_scheme': 'http',
    'jsgi.input': system.stdin,
    'jsgi.error': system.stderr,
    'jsgi.multithread': false,
    'jsgi.multiprocess': false,
    'jsgi.run_once': false,
    SERVER_PORT: system.env.SERVER_PORT
  }

  for (let[k,v] in Iterator(input)) {
    if (k.match(/^HTTP_|CONTENT|COOKIE/) )
      env[k] = v;
  }

  const cgi_headers = "QUERY_STRING SERVER_PORT SCRIPT_NAME PATH_INFO \
      REQUEST_METHOD";
  for (let [_,a] in Iterator(cgi_headers.split(/ /)) ) {
    if (a in input)
      env[a] = input[a]
  }

  [env.SERVER_NAME, env.SERVER_PORT] 
    = (input.HTTP_HOST || input.SERVER_NAME).split(/:/);
  env.SERVER_PORT = env.SERVER_PORT || 80;

  env.juice = { webserver: input.SERVER_SOFTWARE};
  return CGI._fixEnv(env, input);
}

CGI.sendResponse = function sendResponse([code,headers,body]) {
  if (code && parseInt(code) != code || code < 100) {
    CGI.sendResponse(CGI.handleError("invalid code"));
    return;
  }

  var hdrs = new Juice.Utils.Headers(Iterator(headers));

  if (typeof body == "function") {
    //system.stderr.print("body is a function, calling");
    body = body();
  }


  system.stdout.write("Status: " + code + "\r\n" +
                      hdrs.toString() + "\r\n\r\n");

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
      body.close();
  }
  else
    throw new Error("body is not and iterator and has no forEach method");


}

CGI.outputChunk = function outputChunk(chunk) {
  system.stdout.write(chunk);
}

CGI.handleError = function handleError (err) {
  return [500, {'Content-Type': 'text/plain'}, [err.toString()]]; 
}


CGI._fixEnv = function _fixEnv(env, origEnv) {
 
  var webserver = env.juice.webserver;
  if (!webserver)
    return env;

  if (webserver.match(/lighttpd/)) {
    if (env.PATH_INFO === undefined)
      env.PATH_INFO = '';
  }

  return env;
}
