var juice = require('../juice'),
    getCaller = juice.Utils.getCaller,
    deprecated = juice.Utils.deprecationWarning,
    formatHTTPDate = juice.Utils.formatHTTPDate;

/**
 *  class juice.Context
 *
 *  Per request context. Is a 'poor-mans-subclass' of the application.
 **/
var Context = exports.Context = function Context(app, request) {

  function AppContext(request) {
    this.request = request;
  }
  AppContext.prototype = app;

  var ctx = new AppContext(request);

  // Now copy things from the Context.prototype to ctx object -- poor mans MI
  for (var i in Context.prototype) {
    if (Context.prototype.hasOwnProperty(i))
      ctx[i] = Context.prototype[i];
  }

  ctx.init( request );

  return ctx;

}

Context.prototype.init = function( ) {
  var ctx = this;

  var j_env = { docRoot: ctx.docRoot };
  if ("env" in ctx.request == false)
    ctx.request.env = { juice: j_env };
  else
    ctx.request.env.juice = j_env;

  ctx.hostUrl = ctx.request.scheme + "://";

  if ( ctx.request.headers.host )
    ctx.hostUrl += ctx.request.headers.host
  else {
    ctx.hostUrl += ctx.request.host;
    if ( ctx.request.port )
      ctx.hostUrl += ":" + ctx.request.port;
  }

  j_env.hostUrl = ctx.hostUrl;

  // Back compat for 0.1: warn in 0.2, remove in 0.3
  Object.defineProperty(this, "base", {
    getter: function() {
      deprecated("Context#base", "0.3");
      return ctx.hostUrl
    },
    setter: function( x ) {
      deprecated("Context#base", "0.3");
      return ctx.hostUrl = x;
    }
  } );

  Object.defineProperty(this, "redirectTo", {
    setter: function( x ) {
      deprecated("Context#redirectTo", "0.3");
      this.res.redirect( this.absUrlFor( x ), 302 );
    }
  } );

  ctx.response = new juice.Response(ctx);

  // Alias
  Object.defineProperty(this, "res", {
    getter: function() { return this.response },
    setter: function( x ) { return this.response = x }
  } );

  // Pull params into objects
  ctx.buildParams();
}

Context.prototype.runAction = function runAction(captures, action) {
  // decode parameters (i.e. "%20" -> " ")
  captures = captures.map( function( c ) decodeURIComponent( c ) );

  var data = action.controller.apply(this, captures),
      res = this.response,
      redirect, template;

  // Make sure there is a merge funciton.
  if ( "merge" in res == false)
    res.merge = juice.Response.prototype.merge;

  if (action.raw) {
    res = data;
  }
  else if (res.file) {
    if (! res.headers[ 'last-modified' ]) {
      // Do it here rather than in merge to avoid a needless stat if its provided
      this.response.headers[ 'last-modified' ] = formatHTTPDate(
        filesystem.lastModified( res.file )
      );
    }

    // TODO: Do Server sniffing to make this work in more places
    res.headers[ 'x-sendfile' ] = res.file;
    res = res.merge( {
      status: 200,
      headers: {},
      body: []
    } );
  }
  else if (this.format == "json") {
    res = res.merge( {
      status: 200,
      headers: { contentType : 'application/json' },
      body: [ JSON.stringify( data ) ]
    } );
  }
  else if ( "status" in res == false && ( redirect = action.redirect ) ) {
    // If res.status is already set, dont redirect.
    res = res.merge( {
      status: 302,
      headers: { location: this.absUrlFor( redirect ) },
      body: []
    } );
  }
  else if ( ( template = ( res.template || action.render ) ) ) {
    data.juice = this.helpers;
    data.juice.urlFor = this.urlFor.bind(this);
    data.juice.abUrlFor = this.absUrlFor.bind(this);

    var rendered = this.renderTemplate( template, data );

    if ( rendered === undefined )
      throw "Couldn't find template file to load";

    res = res.merge( {
      status: 200,
      headers: { contentType : 'text/html' },
      body: [ rendered ]
    } );
  }
  else if ("status" in res == false || res.status < 300 && res.status > 399 ) {
    // Redirect actions dont need content
    throw new Error( "You need to specify a redirect or a template to render" );
  }
  else {
    res = res.merge( {
      body: [],
      headers: {}
    } );
  }

  return res;
}

Context.prototype.absUrlFor = function( url ) {
  // It already looks like an absolute url -- return it
  if ( arguments.length == 1 && /^\w+:/.exec( url ) )
    return url;

  return this.hostUrl + this.urlFor.apply(this, arguments);
}

Context.prototype.urlFor = function() {
  // TODO: Better url handling and deal with absolute arumgents.
  var url = Array.join(arguments, '/');
  url = url.replace(/\/+/g, '/')
           .replace(/^[^\/]/, '/');

  return this.request.scriptName + url;
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
  var conf = this.config.templates || { "tt" : "tt" };

  const fs = require( 'fs-base' );

  // check each include path in order
  for ( let i = 0; i < this.templatePath.length; ++i ) {
    // check each possible extension in order
    for ( let ext in conf ) {
      // build the path to the template being search for
      var path = this.templatePath[ i ] + file + '.' + ext;

      // if the template exists, render it with the right engine and return
      if ( fs.isFile( path ) ) {
        let template = fs.rawOpen( path, 'r' ).readWhole();

        // load the adaptor for the engine
        let Adaptor = this.loadRelativeComponent( "./view/" + conf[ ext ] ).View,
            engine = new Adaptor( { paths : this.templatePath } );
        return engine.render( template, stash );
      }
    }
  }

  throw "Template not found";
}
