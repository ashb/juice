/** section: Modules
 * fs_mock
 *
 * A module for mocking fs-base using QMock.
 **/
var Mock = require('./qmock').Mock;

/**
 *  fs_mock.mock(tree) -> Function
 *  - tree (Object): the fs structure to mock
 *
 *  Mock it up!
 **/
exports.mock = function mock( tree ) {
  var store = { 
    files: {},
    dirs: {},
    root: [],
    mocks: {}
  };

  for ( var f in tree ) {
    var opt = tree[f];

    if ( f.match( /\/$/ ) ) {
      add_dir( store, f, opt );
    }
    else {
      add_file( store, f, opt );
    }
  }

  // Now build the mock object.
  // We dont use the object-literal constructor as we might need to adjust the
  // mocked functions later (i.e. remove or create). We dont do that for now,
  // but we might want to later
  var mock = new Mock();

  store.mocks.exists = mock.expects()
                           .method("exists")
                           .returns(false)
                           .required(1);
  store.mocks.exists.expectedArgs = [ { accepts: ['/'], returns: true } ];

  mock_directories( mock, store );
  mock_files( mock, store );

  // Compat with broken hippo naming
  mock.rawOpen = mock.openRaw;

  mock.__mock = store.mocks;
  return mock;
}

// "foo/bar/baz/" -> [ 'foo', 'foo/bar', 'foo/bar/baz' ]
function split_dir( dir ) {
  var r = function( dirs, v ) {
    dirs.push( (dirs.length ? dirs[ dirs.length - 1 ] + "/" : '')  + v );
    return dirs;
  };
  return dir.replace( /^\/|\/$/g, '' )
            .split( '/' )
            .reduce( r, [] )
}

function last_comp( x ) {
  return x.replace( /^.*?([^\/]+)$/, "$1");
}
function dir_comp( x ) {
  return x.match( /^(.*?)\/[^\/]+$/ )[1]
}

function add_dir( store, dir ) {
  var prev;
  split_dir( dir ).forEach( function( d ) {
    if ( d in store.files )
      throw new Error("Can't add '" + d + "' as a dir - its already a file!")

    // Add it to the list in parent
    if ( prev ) 
      prev.list.push( last_comp( d ) );
    else 
      store.root.push( d );

    prev = store.dirs[ d ] = {
      list: []
    }
  } );
}

function add_file( store, file, opts ) {
  var dir = dir_comp( file ),
      fname = last_comp( file );

  add_dir( store, dir );

  if (typeof opts != "object")
    opts = { contents: opts };

  store.files[file] = opts;
  store.dirs[dir].list.push( fname );
}

function mock_directories( mock, store ) {

  var isDir = store.mocks.isDirectory ||mock.expects().method("isDirectory"),
      list  = store.mocks.list || mock.expects().method("list"),
      dir_intf = isDir.expectedArgs = [
        { accepts: [ "/" ], returns: true }
      ],
      list_intf = list.expectedArgs = [
        { accepts: [ "/" ], returns: store.root }
      ],
      exists_intf = store.mocks.exists.expectedArgs;

  for ( var i in store.dirs ) {
    // Add "/foo" and "foo" versions (i.e. pwd = virtual /)
    dir_intf.push( { accepts: [ "/" + i ], returns: true },
                   { accepts: [ "/" + i + "/" ], returns: true },
                   { accepts: [ i ], returns: true },
                   { accepts: [ i + "/" ], returns: true } );
    
    list_intf.push( { accepts: [ "/" + i ], returns: store.dirs[i].list },
                    { accepts: [ "/" + i + "/" ], returns: store.dirs[i].list },
                    { accepts: [ i ], returns: store.dirs[i].list },
                    { accepts: [ i + "/" ], returns: store.dirs[i].list } );

    exists_intf.push( { accepts: [ "/" + i ], returns: true },
                      { accepts: [ i ], returns: true },
                      { accepts: [ i ], returns: true },
                      { accepts: [ i + "/" ], returns: true } );
  }

  store.mocks.isDirectory = isDir;
  store.mocks.list = list;

}

function mock_files( mock, store ) {

  var isFile = store.mocks.isFile || mock.expects().method("isFile"),
      openRaw = store.mocks.openRaw || mock.expects().method("openRaw"),
      file_intf = isFile.expectedArgs,
      open_intf = openRaw.expectedArgs,
      exists_intf = store.mocks.exists.expectedArgs;

  for ( var i in store.files ) {
    file_intf.push( { accepts: [ "/" + i ], returns: true },
                    { accepts: [ i ], returns: true } );

    exists_intf.push( { accepts: [ "/" + i ], returns: true },
                      { accepts: [ i ], returns: true } );

    var stream = new Mock( { readWhole: { returns: store.files[i].contents } } );

    // TODO: write mocking.
    open_intf.push( { accepts: [ "/" + i ], returns: stream },
                    { accepts: [ "/" + i, "r" ], returns: stream },
                    { accepts: [ i ], returns: stream },
                    { accepts: [ i, "r" ], returns: stream } );
  }

  store.mocks.isFile = isFile;
  store.mocks.openRaw = openRaw;
}

if (require.main === module ) {
  var fs = exports.mock({ "conf/conf.json": 1 });
  try {
    fs.rawOpen( "conf/conf.json" );
    fs.verify();
  }
  catch (e) {
    print( uneval( e ) );
    print( JSON.stringify( fs.__mock.openRaw, 0, 2 ) );
  }
}
