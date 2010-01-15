let test = require('test'),
    asserts = test.asserts,
    Context = require('../lib/juice/context').Context,
    qmock = require('./lib/qmock'),
    Mock = qmock.Mock;

// simple wrapper for testing throws
asserts.throws = function( testcase, expected, message ) {
  if ( message == undefined ) {
    message = expected;
    expected = undefined;
  }
  try {
    testcase();
    asserts.ok( 0, message );
    asserts.diag( "No error thrown" );
  }
  catch ( e ) {
    if ( expected === undefined || expected == e.toString() ) {
      asserts.ok( 1, message );
    }
    else {
      asserts.ok( 0, message );
      asserts.diag( "   Got: " + e.toString() );
      asserts.diag( "Wanted: " + expected );
    }
  }
}

if (!this.exports) this.exports = {};

exports.test_RenderTemplateDefault = function() {
  var rawTemplate = "raw-template",
      stash = { key : "value" },
      renderedTemplate = "rendered-template";

  var file = new Mock( {
    readWhole : { returns : rawTemplate }
  } );

  qmock.mockModule( 'fs-base', {
    isFile : {
      interface : {
        accepts : [ "templates/index.tt" ],
        returns : true
      }
    },
    rawOpen : {
      interface : {
        accepts : [ "templates/index.tt", "r" ],
        returns : file
      }
    }
  } );

  var app = new Mock( {
    config : {
      interface : {
        accepts : [ "templates" ],
        returns : undefined
      }
    },
    docRoot : { value : "" }
  } );

  qmock.mockModule( 'Template', {
    render : {
      interface : {
        accepts : [ rawTemplate, stash ],
        returns : renderedTemplate
      }
    }
  } );

  asserts.same(
    Context.prototype.renderTemplate.call( app, "index", stash ),
    renderedTemplate,
    "Should default to .tt when there's no conf"
  );
}

exports.test_RenderTemplateNotFound = function() {
  var rawTemplate = "raw-template",
      stash = { key : "value" },
      renderedTemplate = "rendered-template";

  var fs = new Mock( {
    isFile : {
      interface : {
        accepts : [ "templates/index.tt" ],
        returns : false
      }
    }
  } );

  // Flusspferd specific
  require.module_cache[ 'fs-base' ] = fs;

  var app = new Mock( {
    config : {
      interface : {
        accepts : [ "templates" ],
        returns : { "tt" : "Template" }
      }
    },
    docRoot : { value : "" }
  } );

  var tt = new Mock( {
    render : {
      interface : {
        accepts : [ rawTemplate, stash ],
        returns : renderedTemplate
      }
    }
  } );

  // Flusspferd specific
  require.module_cache[ 'Template' ] = tt;

  asserts.throws(
    function() { Context.prototype.renderTemplate.call( app, "index", stash ); },
    "Should throw an error if no template file exists"
  );
}

exports.test_RenderTemplateEngineNotFound = function() {
  var rawTemplate = "raw-template",
      stash = { key : "value" },
      renderedTemplate = "rendered-template";

  var file = new Mock( {
    readWhole : { returns : rawTemplate }
  } );

  var fs = new Mock( {
    isFile : {
      interface : {
        accepts : [ "templates/index.tt" ],
        returns : true
      }
    },
    rawOpen : {
      interface : {
        accepts : [ "templates/index.tt", "r" ],
        returns : file
      }
    }
  } );

  // Flusspferd specific
  require.module_cache[ 'fs-base' ] = fs;

  var app = new Mock( {
    config : {
      interface : {
        accepts : [ "templates" ],
        returns : { "tt" : "Template" }
      }
    },
    docRoot : { value : "" }
  } );

  // Flusspferd specific
  delete require.module_cache[ 'Template' ];
  require.preload[ "Template" ] = function() { throw "Module not found"; }

  asserts.throws(
    function() { Context.prototype.renderTemplate.call( app, "index", stash ) },
    "Should throw an error if the rendering engine doesn't exist"
  );
}

exports.test_RenderTemplateOrder = function() {
  var rawTemplate = "raw-template",
      stash = { key : "value" },
      renderedTemplate = "rendered-template";

  var file = new Mock( {
    readWhole : { returns : rawTemplate }
  } );

  qmock.mockModule( 'fs-base', {
    isFile : {
      interface : [ {
        accepts : [ "templates/index.tt" ],
        returns : false
      }, {
        accepts : [ "templates/index.haml" ],
        returns : true
      } ]
    },
    rawOpen : {
      interface : {
        accepts : [ "templates/index.haml", "r" ],
        returns : file
      }
    }
  } );

  var app = new Mock( {
    config : {
      interface : {
        accepts : [ "templates" ],
        returns : {
          "tt" : "Template",
          "haml" : "haml"
        }
      }
    },
    docRoot : { value : "" }
  } );


  var haml = qmock.mockModule( 'haml', {
    render : {
      interface : {
        accepts : [ rawTemplate, stash ],
        returns : renderedTemplate
      }
    }
  } );

  asserts.same(
    Context.prototype.renderTemplate.call( app, "index", stash ),
    renderedTemplate,
    "Should try the next option if the first doesn't exist"
  );
}

if (require.main == module)
  test.runner(exports);
