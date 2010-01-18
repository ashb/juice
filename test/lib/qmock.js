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

exports.mockForTest = function( mocks, test ) {
  return function() {
    var mocks_to_remove = {};

    try {
      record_mocks = mocks_to_remove;
      exports.unloadJuice();
      mocks();
      return test();
    }
    finally {
      for ( var i in mocks_to_remove ) {
        // QMock has some bugs in mocked members with varying interfaces it seems
        // exports.verifyOk( mocks_to_remove[ i ], i + " mocked ok" );
        delete require.module_cache[ i ];
      }
    }
  }
}

var record_mocks = void 0;
// Flusspferd specific - mock up a module
exports.mockModule = function(module, api) {
  var mock;

  if (typeof api == "function")
    mock = api; // Already mock object. probably.
  else
    mock = new exports.Mock( api );

  var cache;
  if ( "exports" in require.module_cache.flusspferd )
       cache = { exports: mock };
  else cache = mock;

  require.module_cache[ module ] = cache;

  if (record_mocks)

    record_mocks[module] = mock;

  return mock;
}

// Flusspferd specific - unload all juice modules.
exports.unloadJuice = function() {
  for ( var i in require.module_cache ) {
    if ( i.match( /\bjuice\b/ ) && !i.match( /\btest\b/ ) ) {
      delete require.module_cache[i];
    }
  }
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
