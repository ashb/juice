if (!("Juice" in this))
  Juice = {};


(function() {

  Juice.Response = function Juice$Response() {
    // Default to a 200 OK response
    this.headers = new HTTP.Headers({Status: 200})
  }

  var j_res_proto = Juice.Response.prototype = {
    set status(n) { this.headers.Status = n; },
    get status() this.headers.Status,

    set contentType(c) this.headers['Content-Type'] = c,
    get contentType() this.headers['Content-Type'],
  };


  Juice.Engine = function Juice$Engine() {
  }

  RegExp.escape = function(text) {
    if (!arguments.callee.sRE) {
      var specials = [
        '/', '.', '*', '+', '?', '|',
        '(', ')', '[', ']', '{', '}', '\\'
      ];
      arguments.callee.sRE = new RegExp(
        '(\\' + specials.join('|\\') + ')', 'g'
      );
    }
    return text.replace(arguments.callee.sRE, '\\$1');
  }

  // Single list of applications per ctx. For now.
  var applications = [];

  Juice.Engine.prototype = {
    application_for_uri: function(url) {
      for each (let [re, app] in applications ) {
        if (re(url))
          return app;
      }
    },

    // TODO allow more complex registrations without exposing secuity risk
    register_application: function( url_prefix, app) {
      var re;
      if ( (url_prefix instanceof RegExp) == false) {
        re = new RegExp('^' + RegExp.escape(url_prefix) );
      } else {
        re = url_prefix;
      }
      applications.push([re, app]);
      app.registration_point = re;
    },


    handle_request: function(req) {
      var res = new Juice.Response();
      var app = this.application_for_uri(req.uri);
      if (app)
        app.dispatch(req, res);
      else
        this.serve_engine_404(req, res);

      this.send_response(res);
    },

    send_response: function(res) {
      var content = "";
      if ('content' in res && res.content !== undefined)
        content = res.content;


      //if (content instanceof Iterator ||
      //    content.__iterator__ && content.__iterator__() === content)
      if (typeof content.next == 'function' &&
          typeof content.__iterator__ == 'function')
      {
        // We've got a generator, so unknown content-length;
        delete res.headers['Content-Length'];

        this.write(res.headers.toString() + "\r\n\r\n");

        for (let chunk in content) {
          this.write(chunk);
        }
      } else {
        content = content.toString();
        res.headers['Content-Length'] = content.length;
        this.write(res.headers.toString() + "\r\n\r\n");
        this.write(content);
      }

    },

    serve_engine_404: function(req,res) {
      const doc_type = '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">\n';

      // using {uri} in E4X escapes things for us. How kind.
      var uri = req.uri;

      var content = <html>
        <head>
          <title>Juice - No Application Configured</title>
        </head>
        <body>
          <h1>Page Not Found</h1>
          <p>The url {uri} is not served by any application</p>
        </body>
      </html>;

      var content = doc_type + content.toXMLString();
      res.status = 404;
      res.headers.content_type = 'text/html';
      res.content = content;
    }
  };

})()
