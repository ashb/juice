Juice? JavaScript? WTH?

A server-side Javascript webframework built on top of the JSGI protocol. Well,
the [version 3 proposal][JSGI] using the built in asynchronous [Zest] HTTP server.

If you like JS as a language, and clearly I do, then hopefully you'll get on
with Juice:

    var juice = require('juice');
    var app = new juice.Application;

    app.controllers.index = function() {
      return {
        status: 200,
        headers: {},
        body: ["Hello Juicers!"]
      }
    }
    app.urls = { "/?" : { action: "index", raw: true } };

    exports.app = app.setup();

There's more to it than this obviously -- a getting started guide will be
available with version 0.1 which is due for release on 20th Oct. 2009. Edit: The code is mostly ready -- we're just holding off to test things a bit better and to finalize the design of the website.

Juice is currently known to run on [Flusspferd], and should run on other
CommonJS platforms in the future -- it just hasn't been tested yet.

As for running your Juice app - well it ships with its own development server
(which performs surprisingly well) and a CGI version for easy deployment.
Version 0.2 will have FastCGI support.

[JSGI]: http://wiki.commonjs.org/wiki/JSGI/Level0/A
[Zest]: http://www.github.com/ashb/Zest
[Flusspferd]: http://flusspferd.org
