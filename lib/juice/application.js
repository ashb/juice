var juice = require('juice');
var template = require('Template');

var Application = function Application() {
  this.actions = {};
  this.controllers = {};
}

exports.Application = Application;

Application.prototype.run = function(env) {
  // Dispatch the url

  var [ , url, format ] = env.PATH_INFO.match( /^(.*?)(?:\.(\w+))?$/ );
  env['juice.format'] = format;
  for (k in this.actions) {
    let info = this.actions[ k ] = this.buildAction( k, this.actions[ k ], env );

    let re = info.__matcher;

    var res = re(url);

    if (!res)
      continue;

    // We matched! dispatch to the action

    // We assume that re is infact a regexp, so res is an array of the form:
    //
    //  [ 'whole matched text', 'capture1', ... 'captureN' ]
    //
    //  We dont want the whole matched text.
    res.shift();

    return this.runAction(env, res, info);
  }

  // 404!
  return this.notFound(env);
}

Application.prototype.runAction = function(env, captures, action) {

  this.base = env['jsgi.url_scheme']
               + "://"
               + env.SERVER_NAME
               + ":"
               + env.SERVER_PORT
               + env.SCRIPT_NAME
               + "/";

  captures.unshift(env);

  var data = action.action.apply(this, captures);

  if (action.redirect) {
    var headers = new (juice.Utils.Headers);
    headers.location = this.urlFor(action.redirect);
    res = [
      302,
      headers,
      ""
    ];
  }

  // render the data in the appropriate way
  // note that if the format requested is json, this will supercede any redirect planned
  if (env['juice.format'] == "json") {
    res = [
      200,
      { contentType : 'application/json' },
      data.toSource()
    ];
  } else if (action.render) {
    var f = require('io').File( '/Users/dom/Documents/scratchpad/chores/templates/' + action.render );
    var tt = new Template();
    res = [
      200,
      { contentType : 'text/html' },
      tt.process( f.readWhole(), data )
    ];
  }

  return res;
}


Application.prototype.notFound = function(env) {

  var url = env['jsgi.url_scheme']
          + "://"
          + env.SERVER_NAME
          + ":"
          + env.SERVER_PORT
          + env.SCRIPT_NAME
          + env.PATH_INFO;

  var content = <html>
<head>
  <meta http-equiv="Content-Type" content="text/html;charset=UTF-8" />
  <title>Page not found</title>
  <style type="text/css"><![CDATA[
    * { margin: 0; padding: 0; }
    body { background: #eee; color: #000; font: 200 87.5%/1.5 "Lucida Grande", Calibri, sans-serif; }
    #overview { background: #79d108; border-bottom: 1.5em solid #90e71d; padding: 1.5em; }
    #details { padding: 1.5em; }
    h1 { font-size: 1.5em; font-weight: 200; line-height: 1; }
    dl { font-family: Consolas, monospace; margin-top: 1.5em; overflow: auto; }
    dt { clear: both; float: left; margin-right: 1em; text-align: right; width: 5em; }
    dd { float: left; }
    ol { font-family: Consolas, monospace; margin: 1.5em 0 1.5em 3em; }
    code { background: #a6f540; color: #000; font-family: Consolas, monospace; padding: 0.125em; } ]]>
  </style>
</head>
<body>
  <div id="overview">
    <h1>Page not found &#8212; 404</h1>
    <dl>
      <dt>URL:</dt>
      <dd>{url}</dd>
      <dt>Method:</dt>
      <dd>{env.REQUEST_METHOD}</dd>
    </dl>
  </div>
  <div id="details">
    <p>Juice tried to match the URL <code>{env.PATH_INFO}</code> against the
    following patterns, but failed to find a match.</p>
    <ol id="dispatch-table">
    </ol>
  </div>
</body>
</html>

  
  for (k in this.actions) {
    content.body.div[1].ol.* += <li><code>{k}</code></li>;
  }

  return [404, {}, "<!DOCTYPE html>\n" + content ];
}

Application.prototype.urlFor = function() {
  var url = Array.join(arguments, '/');
  url = url.replace(/\/+/g, '/')
           .replace(/^\//, '');

  return this.base + url;
}

Application.prototype.getAction = function( context, name ) {
  for ( [k,v] in Iterator( name.split( '.' ) ) ) {
    if ( v in context == false )
      throw new TypeError( name + " cannot be found in the controller" );
    context = context[ v ];
  }
  return context;
}

Application.prototype.buildAction = function( url, action, env ) {
  if ( typeof action == "function" || typeof action == "string" )
    action = { action : action };

  if ( typeof action.action == "string" )
    action.action = this.getAction( this.controllers, action.action );

  if ( "__matcher" in action && typeof action.__matcher != "function" )
    throw new TypeError( "action.__matcher is not a function" );

  if ( ! "__matcher" in action == false )
    action.__matcher = new RegExp( "^" + url + "$" );

  return action;
}
