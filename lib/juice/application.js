var juice = require('../juice'),
    Validation = require('./validation').Validation,
    filesystem = require('fs-base'),
    sys = require('system');

var Application = function Application( module, rel_root ) {
  function ApplicationIntance() { };
  ApplicationIntance.prototype.__proto__ = this;

  ApplicationIntance.asJSGI = Application.asJSGI;

  Application.init( ApplicationIntance.prototype, module, rel_root );

  return ApplicationIntance;
}

exports.Application = Application;

Application.init = function init( proto, module, rel_root) {
  proto.module = module;

  if (module && module.resource && module.resource.resolve) {
    proto.docRoot = module.resource.resolve( rel_root || ".." );
  }
  else if (module && module.resource) {
    proto.docRoot = module.resource.resolve( rel_root || ".." );
  }
  else {
    throw new TypeError("Juice.Application constructor requires the module object from app.js");
  }

  proto.actions = {};
  proto.urls = {};
  proto.controllers = {};
  proto.models = {};
  proto.helpers = {
    source : function( x ) { return x.toSource(); }
  };
  proto.events = {
    before_setup : [],
    after_setup : []
  };

  Object.defineProperty(proto, 'setupRun', { writable: true, value: false });
}

function evented( name, fn ) {
  return function() {
    var args = Array.slice( arguments, 0 ),
        app = this;

    // run "before" events
    app.events[ "before_" + name ].forEach( function( f ) {
      f.apply( app, args );
    } );

    // run function
    var response = fn.apply( app, args );

    // run "after" events;
    app.events[ "after_" + name ].forEach( function( f ) {
      response = f.call( app, response );
    } );

    return response;
  }
}

/**
 *  Application#setup( [config_dir] ) -> this
 *  - config_dir (String) - directory to load config from.
 *  fires before_setup, after_setup
 *
 *  Setup the app by loading config, building actions and models. Returns this
 *  for chainability
 **/
Application.prototype.setup = evented( "setup", function setup( config_dir ) {
  // TODO: sort this out - maybe make config_dir an options hash instead.
  // compat: warn - this method used to take DOC_ROOT as a param.
  if (arguments.length >= 1) {
    sys.stderr.print("Juice.Application#setup no longer takes a doc root parameter");
  }

  if ( config_dir !== undefined )
    config_dir = filesystem.canonical( config_dir );

  this.loadConfig( config_dir );

  if ("docRoot" in this.config)
    this.docRoot = this.config.docRoot;

  // default template path
  this.templatePath = this.config.templatePath || [ this.docRoot + 'templates/' ];

  for (k in this.urls) {
    this.actions[ k ] = this.buildAction( k, this.urls[ k ] );
  }

  this.buildModels();

  this.setupRun = true;

  // Chainable
  return this;
} );

Application.asJSGI = function() {

  var self, ctor = this;
  var closure = function Juice_App_jsgi(request) {
    if (!self) {
      self = new ctor();
      self.setup();
      closure.juiceInstance = self;
    }
    return self.run(request);
  };
  // Store the app itself, so that we can mess with it in the test etc if we
  // need to if something has nothing else to grab it by
  closure.juiceApp = ctor;
  return closure;
}

Application.prototype.asJSGI = function() {
  var self = this,
      closure;

  // If setup has alredy been run, return a 'nicer' closure
  if ( self.setupRun )
    closure = function Juice_App_JSGI( r ) { return self.run( r ) };
  else {
    closure = function Juice_App_JSGI( request ) {
      if (!self.setupRun) self.setup();

      return self.run(request);
    }
  }

  closure.juiceInstance = self;
  closure.juiceApp = self.constructor;
  return closure;
}

// Separate function so juice/test can override it
Application.prototype.buildContext = function buildContext(request) {
  return new juice.Context(this,request);
}

Application.prototype.run = function run(request) {
  var app = this,
      ctx = app.buildContext(request),
      url = request.pathInfo;

  ctx.format = request.headers.accept &&
               request.headers.accept.match( 'application/json' )
             ? 'json'
             : 'html';

  // Dispatch the url
  try {
    for (k in ctx.actions) {
      let info = ctx.actions[ k ];

      var res = info.__matcher(url);

      if (!res)
        continue;

      // We matched! dispatch to the action

      // We assume that re is infact a regexp, so res is an array of the form:
      //
      //  [ 'whole matched text', 'capture1', ... 'captureN' ]
      //
      //  We dont want the whole matched text.
      res.shift();

      return ctx.runAction(res, info);
    }

    // 404!
    return ctx.notFound();
  }
  catch (e) {
    return ctx.handleError(request, e);
  }
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
      <dd>[%request.requestMethod%]</dd>
    </dl>
  </div>
  <div id="details">
    <p>Juice tried to match the URL <code>[% request.pathInfo %]</code> against the
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

Application.prototype.notFound = function() {
  var request = this.request,
      url = request.env.juice.hostUrl + request.scriptName + request.pathInfo,
      contentType = this.format === "json" ? "application/json" : "text/html",
      data = { url: url,
               actions: this.actions,
               request: request,
               css: this.errorCss },
      tt = new ( require( "Template" ).Template )();

  return {
    status: 404,
    headers: { contentType : contentType },
    body: this.format === "json"
      ? [ JSON.stringify( data ) ]
      : [ tt.process( this.notFoundTemplate, data ) ]
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
      <dd>[% request.requestMethod %]</dd>

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
                "$f.function" | html;
              ELSE;
                "Unknown";
              END -%]</code></span>
          @
          <span>
            [%-
              IF f.fileName;
                "<code>"; f.fileName | html; "</code>";
              ELSE;
                "Unknown";
              END;
              IF f.lineNumber;
                "<code>"; f.lineNumber | html; "</code>";
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

Application.prototype.handleError = function(request, e) {

  var url = request.env.juice.hostUrl + request.scriptName + request.pathInfo,
      contentType = this.format === "json" ? "application/json" : "text/html",
      errorType = (e.constructor ? e.constructor.name : false) || "Unknown Error",
      msg = e.message || e,
      data = { url: url,
               e: e,
               errorType: errorType,
               request: request,
               css: this.errorCss },
      tt = new ( require( "Template" ).Template )();

  if (e.stack)
    data.frames = juice.Utils.splitErrorStack(e.stack);

  return {
    status: 500,
    headers: { contentType : contentType },
    body: this.format === "json"
      ? [ JSON.stringify( data ) ]
      : [ tt.process( this.errorTemplate, data ) ]
  };
}

// Compat: remove in 0.3
Application.prototype.getAction = function( context, name ) {
  return this.controller( name );
}

Application.prototype.controller = function( name ) {
  var context = this.controllers;
  for ( var [k,v] in Iterator( name.split( '.' ) ) ) {
    if ( v in context == false )
      throw new TypeError( name + " cannot be found in the controllers" );
    context = context[ v ];
  }
  return context;
}

Application.prototype.buildAction = function( url, action ) {
  if ( typeof action == "function" || typeof action == "string" )
    action = { controller : action };

  if ( "action" in action ) {
    require('system').stderr.print(
      "action.action is deprecated and will be removed in v0.3\n" +
      " - present in " + uneval( url ) + " action: rename 'action' to 'controller'" );
    action.controller = action.action;
    delete action.action;
  }

  // handle sub apps
  if ( "app" in action ) {
    return this.buildSubappAction( action, url );
  }

  if ( typeof action.controller == "string" ) {
    if ( ! action.render && ! action.redirect )
      action.render = action.controller.replace( '.', '/', 'g' );
    action.controller = this.controller( action.controller );
  }

  if ("static" in action)
    return this.buildStaticAction(action, url)

  if ( "__matcher" in action && typeof action.__matcher != "function" )
    throw new TypeError( "action.__matcher is not a function" );

  if ( "__matcher" in action == false )
    action.__matcher = new RegExp( "^" + url + "$" );

  return action;
}

Application.prototype.buildSubappAction =
function buildSubappAction( action, url ) {
  // find the app to include
  var subapp = require( action.app + "/lib/app.js" ).app.juiceApp;
  delete action.app;

  // if no name is provided default to the url, cleaned up
  if ( "name" in action === false ) {
    // convert special characters to underscores, slashes to dots
    action.name = url.replace( /^\//, "" )
                     .replace( /[^A-Za-z0-9_\/]/g, "_" )
                     .replace( /\//g, "." );
  }

  // merge the subapp models into the main app
  var names = action.name.split( "." ),
      models = subapp.models;

  // dots should make a lovely hierarchy
  while ( names.length > 1 ) {
    let obj = {};
    obj[ names.pop() ] = models;
    models = obj;
  }

  this.models[ names.pop() ] = models;

  // dispatcher for subapp requests
  action.action = function( newurl ) {
    var request = this.request;

    // change the URL to the new one
    request.pathInfo = newurl || "";

    // stick the base in as the script name
    request.scriptName = url;

    // require the subapp and repeat the request
    return subapp.run( request );
  }

  // catchall matcher for subapp urls
  if ( "__matcher" in action === false )
    action.__matcher = new RegExp( "^" + url + "(/.*)?$" );

  // it's raw since the subapp already did the hard work
  action.raw = true;

  return action;
}

Application.prototype.buildStaticAction =
function buildStaticAction(action, url) {
  var app = this,
      urlRe;

  // Relative path - prepend the app.docRoot to it
  if ("docRoot" in app &&
      !action.static.match(/^(?:[a-z]:[\\\/]|\/)/i)) {
    action.static = filesystem.canonical(app.docRoot + action.static);
  }

  // Ensure there is a trailing slash
  action.static = action.static.replace(/\/?$/, '/');
  url = url.replace(/\/?$/, '/');

  // Does the static file/dir reuqested exist;
  if (!filesystem.exists(action.static)) {
    throw new Error("static entry "+ uneval(action.static) +
                    " for " + uneval(url) + " does not exist");
  }

  action.url_re = new RegExp('^' + url);

  action.__matcher = function(url) {
    if (!this.url_re(url)) {
      return undefined;
    }
    // TODO: Do we need to worry about '..'?
    //       Or about URL decoding?
    var file = url.replace(this.url_re, '');

    if (!filesystem.exists(action.static + file))
      return undefined; // Not found, fall back to default 404

    // a[0] gets stripped, and a[1] becomes first argument to action
    return [url, action.static + file];
  }
  action.controller = function(file) {
    this.response.file = file;
  }

  // This action returns a raw JSGI response - in this case to send just
  // X-SendFile headers
  return action;
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

Application.prototype.loadConfig = function( configDir ) {
  var config,
      dir = configDir || this.confDir || this.docRoot + 'conf/';

  // Load the main conf.json differently
  var f = dir + "conf.json";
  if ( filesystem.isFile( f ) ) {
    try {
      config = JSON.parse( filesystem.rawOpen( f, "r" ).readWhole() )
    }
    catch (e) {
      sys.stderr.print("Warning: parse error in config file 'conf.json' -- continuing");
    }
  }
  else {
    config = {};
  }

  filesystem.list( dir ) .forEach( function ( f ) {
    if ( f == "conf.json" || !f.match(/\.json$/) || 
         f.match( /^\./ ) || !filesystem.isFile( dir + f ) )
      return;

    try {
      var c = JSON.parse( filesystem.rawOpen( dir + f, "r" ).readWhole() )
      f = f.replace(/\.json$/, "");

      if (f in config && typeof config[f] != "object") {
        throw new Error("Juice.Application#loadConfig: hierarchy error -" +
                        " sub config '" + f + "' loaded but property exists and is not an object")
      }
      config[f] = c;
    }
    catch (e) {
      if (e.name == "SyntaxError")
        sys.stderr.print("Warning: parse error in config file '" + f + "' -- continuing");
      else
        throw e;
    }
  } )

  this.config = config;
}

// Application#loadRelativeComponent( id ) -> module
//
// Try loading id relative to the application if its found, else try loading
// the default juice relative id. Failing that throw.
//
// Returns the exports object

Application.prototype.loadRelativeComponent = function( id ) {
  // Flusspferd specific behaviour: resource.resolve and 'file://' uris to require
  var file = this.module.resource.resolve( id + ".js" );

  if ( filesystem.isFile( file ) ) {
    return require( 'file://' + file );
  }

  var err = "Unable to load module 'file://" + module.resource.resolve( id + ".js" ) + "':";
  try {
    return require( id );
  }
  catch (e) {
    if ( e.message && e.message.indexOf(err) == 0 ) {
      throw new Error("Unable to load module '" + id + "': neither app specific nor juice version could be found")
    }
    else throw e;
  }
}

Application.prototype.buildModels = function( ) {
  var proto = Object.getPrototypeOf( this );

  // We dont want to mess up with the proto, so this means the instance gets a
  // new object to put things on, leaving the prototype un-altered
  this.models = {};

  for ( var m in proto.models ) {
    if ( typeof proto.models[ m ] == "function" ) {
      this.instantiateComponent( "models", m, proto.models[ m ] );
    }
    else
      this.models[ m ] = proto.models[ m ];
  }
}

// We pass section and name because we might want to do auto-config
// loading/passing at some point soon.
Application.prototype.instantiateComponent = function( section, name, ctor ) {
  var instance = new ctor( this );
  this[ section ][ name ] = instance;
}
