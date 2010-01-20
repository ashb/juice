// This really doesn't belong in Juice dist, but it will do for now

const onWindows = "windir" in require('system').env,
      fs = require('fs-base'),
      io = require('io');

exports.batchFilesNeeded = onWindows;

// fs-base doesn't have this yet.
exports.makeTree = function makeTree(dir) {
  dir = fs.canonical(dir);
  if (fs.exists(dir))
    return dir;

  dir.split('/')
     .reduce(function(accum, dir) {
        accum += '/' + dir;
        if (!fs.exists(accum)) 
          fs.makeDirectory(accum);
        return accum
      });
  return dir;
}

exports.dirName = function(file) {
  var m = file.replace(/^file:\/\//, '').match(/^(.*\/)[^\/]+$/);

  if (m)
    return m[1];
  else
    return file;
}

exports.baseName = function(file) {
  return file.match(/[^\/]*$/)[0];
}


exports.install = function(opts) {

  var installer = new Installer(opts)

  installer.run();
}

var Installer = exports.Installer = function Installer(args) {
  this.makeBatFiles = onWindows;

  if (args) {
    for ( var i in args ) {
      this[ i ] = args[ i ];
    }
  }
  else {
    print("Using default dirs");
    if ( fs.isDirectory("lib") )
      this.lib = "lib";
    if ( fs.isDirectory("build") )
      this.blib = "build";
    if ( fs.isDirectory("bin") )
      this.bin = "bin";
  }

  var self = this;
  var x = require('getopt').getopt( {
    'symlink': {
      alias: 's',
      callback: function() { self.symlink = true }
    },
    'no-bin' : {
      callback: function() { delete self.bin }
    },
  }, require('system').args.slice( 1 ) );
  print( uneval( x ) );

  if ( !this.moduleDest ) {
    this.moduleDest = fs.canonical( Installer.default_module_dir() );
  }

}

Installer.default_module_dir = function() {

  var f = require('flusspferd'),
      fs = require('fs-base');

  // Work out if we should install into the user or system module dirs:
  // Use the userModuleDir if it exists or if the system one isn't writable
  return 'userModuleDir' in f &&
         (fs.isDirectory(f.userModuleDir) || !fs.isWriteable(f.systemModuleDir))
       ?  f.userModuleDir
       :  f.systemModuleDir
}

Installer.prototype.run = function() {

  for each ( var t in ["lib", "blib", "bin"] ) {
    if (t in this) {
      if ( !fs.isDirectory( this[t] ) )
        throw TypeError( "Source " + t + " dir " + uneval( this[t] ) + " does not exist" );

      this["install_" + t + "_tree"](this[t]);
    }
  }
}

/// Install files from lib tree
// Recursively copy .js files over
Installer.prototype.install_lib_tree = function(libDir) {
  libDir = fs.canonical(libDir);
  if (!fs.isDirectory(libDir))
    throw new Error(libDir + ' is not a directory!');

  print(libDir)

  this._install_tree(libDir, libDir, /\.js$/);
}

/// Install files from binary-lib tree
Installer.prototype.install_blib_tree = function(libDir) {
  libDir = fs.canonical(libDir);
  if (!fs.isDirectory(libDir))
    throw new Error(libDir + ' is not a directory!');

  this._install_tree(libDir, libDir, /\.(?:dylib|dll|so)$/);
}

Installer.prototype._install_tree = function(dir, root, fileRegExp) {
  for ( let [,p] in Iterator( fs.list( dir ) ) ) {
    p = dir + p;

    if( fs.isDirectory( p ) ) {
      this._install_tree( p + "/", root, fileRegExp );
    }
    else if ( p.match(fileRegExp) ) {
      var local = p.replace(root, ''),
          target = this.moduleDest + local

      this.install_file(root, this.moduleDest, local, "module");
    }
  }
}

Installer.prototype.install_bin_tree = function(dir) {
  for (let [,p] in Iterator( fs.list( dir)  ) ) {
    if( fs.isFile( dir + "/" + p ) && !exports.baseName( p ).match( '^\\.' ) )
      this.install_script(dir + "/" + p);
  }
}

Installer.prototype.install_script = function(source) {
  if (!fs.isFile(source)) 
    throw new Error(source + " isn't a file");

  if ( "destBin" in this == false )
    throw new Error( "Can't install scripts without a destBin dir" );

  var filename = exports.baseName(source);

  // since our fs-base doesn't yet support permissions, we need to use io.File to
  // make it executable first
  io.File.create( this.binDir + filename, parseInt( "0777", 8 ) );

  this.install_file(source, this.binDir + filename, "script");

  if (this.makeBatFiles) {
    var f = fs.rawOpen(this.binDir + filename + ".bat", 'w');
    f.print(exports.batchFile);
  }
}

Installer.prototype.install_file = function(from_dir, to_dir, local, type) {
  exports.makeTree( exports.dirName( to_dir + local ) );

  var to = to_dir + local;
  if ( fs.exists( to ) )
    fs.remove( to );

  if (this.symlink) {
    print("Symlinking " + type + " " + local + " -> " + to );
    fs.link( from_dir + local, to );
  }
  else {
    print("Installing " + type + " " + local );

    var s_fh = fs.rawOpen(from_dir + local, 'r'),
        d_fh = fs.rawOpen(to, 'w');

    var blob = s_fh.readBinary();
    while (blob.length) {
      d_fh.write(blob);
      blob = s_fh.readBinary();
    } 
    s_fh.close();
    d_fh.close();
  }
}

// Text of batch file which provides sanity on windows (of a sort anyway)
exports.batchFile=""+<><![CDATA[@echo off

SetLocal EnableDelayedExpansion

:: Expand %0 into a full pathname, and strip .bat off the end
set FILE=%~f0
set FILE=%FILE:.bat=%
:: And get the fully qualified dir in which the script lives, to look for
:: flusspferd.exe if its not in the path
set DIR=%~dp0

:: Get the first line of the file
for /f "usebackq delims=" %%a in ("%FILE%") do (
set line=%%a
goto shebang
)

:shebang
set shebang_opts=
if "[%line%]" == "[]" goto run

:: see if flusspferd is found in the shebang ling
  set _shebang=%line:*flusspferd=flusspferd%
  :: remove chars after 'flusspferd'
  set _result=%_shebang:~0,10%

  if %_result% NEQ flusspferd goto :bad_shebang

  set shebang_opts=%_shebang:flusspferd=%
:run

for %%a in ("flusspferd.exe" "%DIR%/flusspferd.exe") do (
  set FLUSSPFERD=%%~$PATH:a
  if exist !FLUSSPFERD! goto run
)

goto :no_flusspferd

:run
!FLUSSPFERD! %shebang_opts% "%FILE%" %* 
if %ERRORLEVEL% EQU 9009 goto :no_flusspferd
exit /B %ERRORLEVEL%


:bad_shebang
echo. %FILE% contained a non-flusspferd shebang line:
echo.   %_shebang%
call :setError 2

:no_flusspferd
echo flusspferd.exe not found in your path
call :setError 1

:setError
exit /B %1
]]></>;


if (require.main === module) {
  print("installer run as main - attempting to install from $PWD");
  exports.install()
}
