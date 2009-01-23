(function() {

  import("juice.engine.cgi");

  var FCGI = import( "fcgi");
  var fastcgi = function Juice$Engine$FastCGI$_ctor(socket) {
    this.__proto__.__proto__.constructor.apply(this); // Aka call super proto
    this.fcgi = new FCGI(socket);
  };

  fastcgi.prototype = {
    run: function Juice$Engine$FastCGI$run() {
      while (this.fcgi.accept() >= 0) {
          var env = this.fcgi.env;

          // If we're running under Lighttpd, swap PATH_INFO and SCRIPT_NAME
          // http://lists.scsys.co.uk/pipermail/catalyst/2006-June/008361.html
          //if (/lighttpd/.exec(env.SERVER_SOFTWARE))
          //  env.PATH_INFO = env.SCRIPT_NAME;

          var req = this.parse_request(env);

          this.handle_request(req);
      }
    },

    write: function(buffer) {
      this.fcgi.putstr(buffer);
    },
    __proto__: Juice.Engine.CGI.prototype
  };

  Juice.Engine.FastCGI = fastcgi;
})();
