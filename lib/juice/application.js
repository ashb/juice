var juice = require('juice'),
    Template = require('Template').Template,
    Validation = require('juice/validation').Validation;

var Application = function Application() {
  this.actions = {};
  this.controllers = {};
  this.helpers = {
    source : function( x ) { return x.toSource(); }
  };
}

exports.Application = Application;

Application.prototype.run = function run(env) {
  // Dispatch the url

  try {

    // Pull params into objects
    this.buildParams(env);

    var [ , url, format ] = env.pathInfo.match( /^(.*?)(?:\.(\w+))?$/ );
    env.juice.format = format;
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
  catch (e) {
    return this.handleError(env, e);
  }
}

Application.prototype.runAction = function runAction(env, captures, action) {

  this.base = env.scheme
               + "://"
               + env.serverName
               + ":"
               + env.serverPort
               + env.scriptName
               + "/";

  captures.unshift(env);

  var data = action.action.apply(this, captures);
  var res, redirect;

  if (env.juice.format == "json") {
    res = {
      status: 200,
      headers: { contentType : 'application/json' },
      body: data.toSource()
    };
  }
  else if ( ( redirect = this.redirectTo || action.redirect ) ) {
    var headers = new (juice.Utils.Headers);
    headers.location = this.urlFor(redirect);
    res = {
      status:302,
      headers: headers,
      body: ""
    };
  }
  else if (action.render) {
    // TODO: This isn't CommonJS compliant yet. But there isn't a
    // ratified/agreed upon spec for files yet
    var f = require('io').File( env.juice.docRoot + 'templates/' + action.render );

    var tt = new Template();
    data.juice = this.helpers;
    res = {
      status: 200,
      headers: { contentType : 'text/html' },
      body: tt.process( f.readWhole(), data )
    };
  }
  else {
    throw new Error( "You need to specify a redirect or a template to render" );
  }

  return res;
}

/**
 * CSS for built in 404 and 500 error pages.
 */
Application.prototype.errorCss = [
'    * { margin: 0; padding: 0; }',
'    body { background: #eee; color: #000; font: 200 87.5%/1.5 "Lucida Grande", Calibri, sans-serif; }',
'    #overview { background: #79d108; border-bottom: 1.5em solid #90e71d; padding: 1.5em; }',
'    #details { padding: 1.5em; }',
'    h1 { font-size: 1.5em; font-weight: 200; line-height: 1; }',
'    dl { font-family: Consolas, monospace; margin-top: 1.5em; overflow: auto; }',
'    dt { clear: both; float: left; margin-right: 1em; text-align: right; width: 9em; }',
'    dd { float: left; }',
'    ol { font-family: Consolas, monospace; margin: 1.5em; }',
'    code { background: #a6f540; color: #000; font-family: Consolas, monospace; font-size: 1em; padding: 0.125em; }',
'    ol.stacktrace {display: table }',
'    ol.stacktrace li { display: table-row; }',
'    ol.stacktrace span { display: table-cell; }',
'    ol.stacktrace span:first-child { padding-right: 1em; text-align: right; }',
'    ol.stacktrace span:last-child { padding-left: 1em; }'
].join('\n');

/**
 * Template to render when no actions match
 */
Application.prototype.notFoundTemplate = <><![CDATA[<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="Content-Type" content="text/html;charset=UTF-8" />
  <title>Page not found</title>
  <style type="text/css">
[% css %]
  </style>
</head>
<body>
  <div id="overview">
    <h1>Page not found &#8212; 404</h1>
    <dl>
      <dt>URL:</dt>
      <dd>[% url %]</dd>
      <dt>Method:</dt>
      <dd>[%env.requestMethod%]</dd>
    </dl>
  </div>
  <div id="details">
    <p>Juice tried to match the URL <code>[% env.pathInfo %]</code> against the
    following patterns, but failed to find a match.</p>
    <ol id="dispatch-table">
[% FOREACH k IN actions %]
      <li><code>[% k.key %]</code></li>
[% END -%]
    </ol>
  </div>
</body>
</html>
]]></> + "";

Application.prototype.notFound = function(env) {

  var url = env.scheme
          + "://"
          + env.serverName
          + ":"
          + env.serverPort
          + env.scriptName
          + env.pathInfo;

  var tt = new Template();
  return {
    status: 404,
    headers: { contentType : 'text/html' },
    body: tt.process(
      this.notFoundTemplate,
      { url: url,
        actions: this.actions,
        env: env,
        css: this.errorCss
      }
    )
  };
}

/**
 * Template to render when handling an action throws an error
 */
Application.prototype.errorTemplate = <><![CDATA[<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="Content-Type" content="text/html;charset=UTF-8" />
  <title>Server error</title>
  <style type="text/css">
[% css %]
  </style>
</head>
<body>
  <div id="overview">
    <h1>[% errorType %] &#8212; 500</h1>
    <dl>
      <dt>Error message:</dt>
      <dd>[% e.message || e %]</dd>
      <dt>URL:</dt>
      <dd>[% url %]</dd>
      <dt>Method:</dt>
      <dd>[% env.requestMethod %]</dd>

[% IF e.fileName %]
      <dt>File:</dt>
      <dd>[%e.fileName%]</dd>
[% END;
   IF e.lineNumber %]
      <dt>Line number:</dt>
      <dd>[%e.lineNumber%]</dd>
[% END %]
    </dl>
  </div>
  <div id="details">
[% IF !frames.length %]
    <p>Sorry, no stack trace is avilable</p>
[% ELSE %]
    <ol class="stacktrace">
[% FOREACH f IN frames; %]
      <li><span><code>[%
              IF f.function;
                "$f.function";
              ELSE;
                "Unknown";
              END -%]</code></span>
          @
          <span>
            [%-
              IF f.fileName;
                "<code>$f.fileName</code>";
              ELSE;
                "Unknown";
              END;
              IF f.lineNumber;
                ", <code>$f.lineNumber</code>";
              END;
          -%]
          </span>
      </li>
[% END %]
    </ol>
[% END %]
  </div>
</body>
</html>
]]></> + "";

Application.prototype.handleError = function(env, e) {

  var url = env.scheme
          + "://"
          + env.serverName
          + ":"
          + env.serverPort
          + env.scriptName
          + env.pathInfo;

  var errorType = (e.constructor ? e.constructor.name : false) || "Unknown Error";
  var msg = e.message || e;

  var tt = new Template();
  var data = {
    url: url,
    e: e,
    errorType: errorType,
    env: env,
    css: this.errorCss
  };

  if (e.stack)
    data.frames = juice.Utils.splitErrorStack(e.stack);

  return {
    status: 500,
    headers: { contentType : 'text/html' },
    body: tt.process( this.errorTemplate, data )
  };
}

Application.prototype.urlFor = function() {
  var url = Array.join(arguments, '/');
  url = url.replace(/\/+/g, '/')
           .replace(/^\//, '');

  return this.base + url;
}

Application.prototype.getAction = function( context, name ) {
  for ( var [k,v] in Iterator( name.split( '.' ) ) ) {
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

Application.prototype.buildParams = function buildParams(env) {

    env.juice.params = {
      get: env.queryString ? juice.Utils.splitQueryString(env.queryString) : {},
      post: {}
    };

    var len = env.headers['content-length'];
    if (len && env.requestMethod == "POST" &&
        env.headers['content-type'] == 'application/x-www-form-urlencoded')
    {
      var body = env.body.read(len);
      env.juice.params.post = juice.Utils.splitQueryString(body);
    }
}

Application.prototype.validate = function( form, params ) {
  var data = {};
  // loop through |params|, stick values into |field| key of the spec.
  for (let [field, spec] in Iterator(form)) {
    data[field] = juice.Utils.clone(spec, true);
    // use input: key if it exists, else take key in fields: struct
    if ("input" in spec) data[field].value = params[spec.input];
    else if (field in params) data[field].value = params[field];
  }

  return (new Validation(data)).validate();
}

