// module.resouce.revolve is flusspferd specific
require('flusspferd');
loadQMock();

function loadQMock() {
  var fs = require('fs-base'),
      file = module.resource.resolve('../../vendor/qmock/qmock.js');

  if (!fs.isFile(file) ) {
    no_submodule();
  }

  var qmock = require('../../vendor/qmock/qmock');
  for (var i in qmock) {
    exports[ i ] = qmock[ i ];
  }
}

function no_submodule() {
  require('system').stderr.print(
    "QMock module not found. Please run:\n" +
    "\n" +
    "    git submodule update --init vendor/qmock\n" +
    "    (cd vendor/qmock && git submodule update --init)\n" +
    "\n" +
    "from the root checkout to get it"
  );
  throw "qmock submodule not found!";
}

