Juice? JavaScript? WTH?
=======================

What is JuiceJS?
----------------

JuiceJS is server-side Javascript web-framework built on top of the JSGI
protocol, version 3 (proposal). The [JSGI] interface is built using the
asynchronous [Zest] HTTP server.

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

There's more to it than this obviously -- check out the [getting started guide]
for an more thorough introduction to the basics.

Juice is currently known to run on [Flusspferd], and should run on other
CommonJS platforms in the future -- it just hasn't been tested yet.

As for running your Juice app - well it ships with its own development server
(which performs surprisingly well) and a CGI version for easy deployment.
Version 0.2 will have FastCGI support.

Commit Activity?
-----------------

Nothing much going on here? We're busy working elsewhere!

* tweaking and extending Zest to add [timers][zest_timers]
* writing useful libraries for Juice and other CommonJS platforms: [Markdown],
  [MongoDB] and [http-fetch]
* playing with getting Sizzle working for server-side DOM querying.

[JSGI]: http://wiki.commonjs.org/wiki/JSGI/Level0/A
[Zest]: http://www.github.com/ashb/Zest
[Flusspferd]: http://flusspferd.org
[getting started guide]: http://juicejs.org/guides/getting-started
[Markdown]: http://github.com/evilstreak/markdown-js
[MongoDB]: http://github.com/ashb/mongodb-flusspferd/
[http-fetch]: http://github.com/evilstreak/http-fetch
[zest_timers]: http://github.com/ashb/Zest/blob/timers/src/reactor.pdoc
