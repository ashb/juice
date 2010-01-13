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
