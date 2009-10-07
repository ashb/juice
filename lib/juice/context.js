var juice = require('../juice'),
    Template = require('Template').Template;

var Context = exports.Context = function Context(env, app) {

  function AppContext(env) {
    this.stash = {};
    this.env = env;
  }
  AppContext.prototype = app;

  var ctx = new AppContext(env);

  // Now copy things from the Context.prototype to ctx object

  for (var i in Context.prototype) {
    if (Context.prototype.hasOwnProperty(i))
      ctx[i] = Context.prototype[i];
  }

  // Pull params into objects
  ctx.buildParams();

  return ctx;

}

Context.prototype.runAction = function runAction(captures, action) {

  this.base = this.env.scheme
               + "://"
               + this.env.serverName
               + ":"
               + this.env.serverPort
               + this.env.scriptName
               + "/";

  captures.unshift(this.env);

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
    // TODO: This isn't CommonJS compliant yet. But there isn't a
    // ratified/agreed upon spec for files yet
    var f = require('io').File( this.env.juice.docRoot + 'templates/' + action.render );

    var tt = new Template();
    data.juice = this.helpers;
    data.juice.urlFor = this.urlFor.bind(this);
    res = {
      status: 200,
      headers: { contentType : 'text/html' },
      body: [ tt.process( f.readWhole(), data ) ]
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
  this.env.juice = this.env.juice || {};
  this.env.juice.params = {
    get: this.env.queryString ? juice.Utils.splitQueryString(this.env.queryString) : {},
    post: {}
  };

  var len = this.env.headers['content-length'];
  if (len && this.env.requestMethod == "POST" &&
      this.env.headers['content-type'] == 'application/x-www-form-urlencoded')
  {
    var body = this.env.body.read(len).decodeToString();
    this.env.juice.params.post = juice.Utils.splitQueryString(body);
  }
}

