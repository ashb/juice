(function () {

  import("juice.engine");
  import("juice.request");
  import("http.headers");
  import("io");

  var cgi = function Juice$Engine$CGI$_ctor() {
    this.__proto__.__proto__.constructor.apply(this)
  }

  cgi.prototype = {
    __proto__: Juice.Engine.prototype,

    populate_headers: function(env, req) {
      // mmmm generators are fun!
      var it = ([i.replace(/^HTTP_/,''),env[i]] for(i in env) if (i.match(/^HTTP_|CONTENT|COOKIE/) ) )

      req.headers = new HTTP.Headers( it );
    },

    _populate_params: function(qs, param_obj) {
      if (!qs || qs.length == 0)
        return;
      for each (let p in qs.split(/&/)) {
        let [k,v] = p.split(/=/).map( decodeURIComponent );
        if ( ( k in param_obj) == false )
          param_obj[k] = new Array(0);

        param_obj[k].push( v )
      }
    },

    populate_query_params: function(env, req) {
      var qs = env.QUERY_STRING;
      req.query_params = {}

      this._populate_params(env.QUERY_STRING, req.query_params);
    },

    populate_post_params: function(req) {
      // TODO: This will need cleaning up later.
      if (req.headers.contentType == 'application/x-www-form-urlencoded' &&
          'Content-Length' in req.headers) {
        var len = req.headers.contentLength;
        if (len > 0) {
          var urlenc = IO.stdin.read(len);
          this._populate_params(urlenc, req.post_params);
        }
      }
    },

    // Build up the request object. Returns it
    parse_request: function Juice$CGI$parse_request(env) {

      var req = new Juice.Request();

      var host = env.HTTP_HOST || env.SERVER_NAME || 'localhost:80';
      var port = env.SERVER_PORT || 80;

      req.secure = env.HTTPS == 'ON' || env.SERVER_PORT == 443;
      //req.hostname = env.REMOTE_HOST;
      req.method = env.REQUEST_METHOD;
      req.protocol = env.SERVER_PROTOCOL;

      var base_path;
      if ('REDIRECT_URL' in env) {
        base_path = env.REDIRECT_URL;
        var re = new RegExp( RegExp.escape(env.PATH_INFO) + '$' ); 
        base_path = base_path.replace(re, '')
      } else {
        base_path = env.SCRIPT_NAME || '/';
      }

      // Find HTTP headers that came across in the env
      this.populate_headers(env, req);

      // Pull out query params
      this.populate_query_params(env, req);

      // HTTP_HOST will include the port even if it's 80/443
      req.host = host.replace(/:\d+$/, '');
      req.port = port;
      port = port != 80 && port != 443 ? ":" + port : "";

      var scheme = (req.secure ? 'https' : 'http') + '://';


      base_path = env.SCRIPT_NAME;

      //req.uri = base_path + path;
      base_path = scheme + req.host + port + base_path;

      var path = env.PATH_INFO || '';

      req.uri = base_path;
      req.path = path.replace(/^\/*/, '/');
      if (path.length)
        req.uri += req.path

      // escape the uri so its valid
      req.uri = req.uri.replace(
        /(\?)|([^A-Za-z0-9;/?:@&=+$,\[\]-_.!~*'()])/g,
        function(s,q,c) "%" + (q ? "3F" : c.charCodeAt(0).toString(16) )
      );
      if (env.QUERY_STRING)
        req.uri += '?' + env.QUERY_STRING;

      req.base = base_path.replace(/\/$/, '');

      if (req.method == 'POST')
        this.populate_post_params(req);

      return req;
    },

    run: function Juice$Engine$CGI$run() {
      var env = import('environment');
      var req = this.parse_request(env);

      this.handle_request(req);
    },

    // output is just global print function
    write: print

  };

  Juice.Engine.CGI = cgi;

})();
