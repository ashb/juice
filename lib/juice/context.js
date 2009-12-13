var juice = require('../juice');

var Context = exports.Context = function Context(app, request) {

  function AppContext(request) {
    this.stash = {};
    this.request = request;
  }
  AppContext.prototype = app;

  var ctx = new AppContext(request);

  // Now copy things from the Context.prototype to ctx object -- poor mans MI
  for (var i in Context.prototype) {
    if (Context.prototype.hasOwnProperty(i))
      ctx[i] = Context.prototype[i];
  }

  var j_env = { docRoot: this.docRoot };
  if ("env" in request == false)
    request.env = { juice: j_env };
  else
    request.env.juice = j_env;

  ctx.base = request.scheme + "://"
           + ctx.request.host + ":"
           + ctx.request.port
           + ctx.request.scriptName + "/";

  // Pull params into objects
  ctx.buildParams();

  return ctx;

}

Context.prototype.runAction = function runAction(captures, action) {

  var data = action.action.apply(this, captures);
  var res, redirect;

  if (action.raw) {
    return data;
  }
  if (this.format == "json") {
    res = {
      status: 200,
      headers: { contentType : 'application/json' },
      body: [ data.toSource() ]
    };
  }
  else if ( ( redirect = this.redirectTo || action.redirect ) ) {
    var headers = new (juice.Utils.Headers);
    headers.location = this.urlFor(redirect);
    res = {
      status:302,
      headers: headers,
      body: []
    };
  }
  else if (action.render) {
    data.juice = this.helpers;
    data.juice.urlFor = this.urlFor.bind(this);

    var rendered = this.renderTemplate( action.render, data );

    if ( rendered === undefined )
      throw "Couldn't find template file to load";

    res = {
      status: 200,
      headers: { contentType : 'text/html' },
      body: [ rendered ]
    };
  }
  else {
    throw new Error( "You need to specify a redirect or a template to render" );
  }

  return res;
}

Context.prototype.urlFor = function() {
  var url = Array.join(arguments, '/');
  url = url.replace(/\/+/g, '/')
           .replace(/^\//, '');

  return this.base + url;
}

Context.prototype.buildParams = function buildParams() {
  var store = this.request.env.juice;
  store.params = {
    get: this.request.queryString ? juice.Utils.splitQueryString(this.request.queryString) : {},
    post: {}
  };

  var len = this.request.headers['content-length'];
  if (len && this.request.method == "POST" &&
      this.request.headers['content-type'] == 'application/x-www-form-urlencoded')
  {
    var body = this.request.input.read(len).decodeToString();
    store.params.post = juice.Utils.splitQueryString(body);
  }

  this.params = store.params;
}

Context.prototype.renderTemplate = function( file, stash ) {
  // load templates config or default to TT if not available
  var conf = this.config( 'templates' ) || { "tt" : "Template" };

  const fs = require( 'fs-base' );

  for ( let ext in conf ) {
    // build the path to the template using the extension from conf
    var path = this.docRoot + 'templates/' + file + '.' + ext;

    // if the template exists, render it with the right engine and return
    if ( fs.isFile( path ) ) {
      let template = fs.rawOpen( path, 'r' ).readWhole();
      let engine = require( conf[ ext ] );
      return engine.render( template, stash );
    }
  }

  throw "Template not found";
}
