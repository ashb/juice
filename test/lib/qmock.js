// warnings: no
require('flusspferd'); eval(getQMockSource()); // Line numbers out by one still :(

// This module does flusspferd specific tricks.

// The qmock source is a mess, so eval it in a file with warnings disabled. We
// probably need a way of requring a module with warnings turned off remotely
// in addition to from withing the file.

function getQMockSource() {
  var fs = require('fs-base'),
      file = module.resource.resolve('../../vendor/qmock/qmock.js');

  if (!fs.isFile(file) ) {
    no_submodule();
  }

  return fs.rawOpen(file, 'r').readWhole();
}

function no_submodule() {
  require('system').stderr.print(
    "QMock module not found. Please run:" +
    "\n\n    git submodule update --init vendor/qmock\n\n" +
    "from the root checkout to get it"
  );
  throw "qmock submodule not found!";
}

// Flusspferd specific - mock up a module
exports.mockModule = function(module, api) {
  var mock = new exports.Mock( api );

  var cache;
  // TODO: Maybe we should change the exports in place if its already loaded?
  if ( "exports" in require.module_cache.flusspferd )
       cache = { exports: mock };
  else cache = mock;

  require.module_cache[ module ] = cache;

  return mock;
}

exports.verifyOk = function( mock, msg ) {
  const asserts = require('test').asserts;

  try {
    mock.verify();
    asserts.ok(true, msg || "mocked ok");
  }
  catch (e) {
    asserts.ok(false, msg || "mocked ok");
    asserts.diag( uneval( e ) );
  }

}
