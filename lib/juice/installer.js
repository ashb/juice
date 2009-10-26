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

  var installer;
  if (typeof opts == "object") {
    if ("installDir" in opts) {
      installer = new Installer(opts.installDir);
      delete opts.installDir;
    } else {
      installer = new Installer();
    }
  }
  else {
    installer = new Installer();
    opts = String(opts);

    // Take the directory from which this file is in.
    if (opts.match("^file://")) {
      opts = exports.dirName(opts);
    }

    if (!fs.isDirectory(opts)) 
      throw new Error(opts + " is not a directory");
    
    let dir = fs.canonical(opts);
    opts = {
      lib: dir + "lib",
      blib: dir + "build",
      bin: dir + "bin"
    }
  }

  if (opts.lib && fs.isDirectory(opts.lib))
    installer.installLibTree(opts.lib);
  
  if (opts.blib && fs.isDirectory(opts.blib))
    installer.installBlibTree(opts.blib);

  if (opts.bin && fs.isDirectory(opts.bin))
    installer.installScripts(opts.bin);
}

var Installer = exports.Installer = function Installer(installDir) {
  if (installDir === undefined) {
    installDir = require('flusspferd').executableName + "/../..";
  }
  this.dest = fs.canonical(installDir);
  this.binDir = this.dest + 'bin/';
  this.modDir = this.dest + 'lib/flusspferd/modules/';
  this.makeBatFiles = onWindows;
}


/// Install files from lib tree
// Recursively copy .js files over
Installer.prototype.installLibTree = function(libDir) {
  libDir = fs.canonical(libDir);
  if (!fs.isDirectory(libDir))
    throw new Error(libDir + ' is not a directory!');

  this._installTree(libDir, libDir, /\.js$/);
}

/// Install files from binary-lib tree
Installer.prototype.installBlibTree = function(libDir) {
  libDir = fs.canonical(libDir);
  if (!fs.isDirectory(libDir))
    throw new Error(libDir + ' is not a directory!');

  this._installTree(libDir, libDir, /\.(?:dylib|dll|so)$/);
}

Installer.prototype._installTree = function(dir, root, fileRegExp) {
  for (let [,p] in Iterator(fs.list(dir)) ) {
    if(fs.isDirectory(p)) {
      this._installTree( p, root, fileRegExp );
    }
    else if (p.match(fileRegExp)) {
      var target = this.modDir + p.replace(root, '');
      exports.makeTree( exports.dirName(target) );
      this.copyFile( p, target);
    }
  }
}

Installer.prototype.installScripts = function(dir) {
  for (let [,p] in Iterator(fs.list(dir)) ) {
    if(!exports.baseName(p).match('^\\.'))
      this.installScript(p);
  }
}

Installer.prototype.installScript = function(source) {
  if (!fs.isFile(source)) 
    throw new Error(source + " isn't a file");

  var filename = exports.baseName(source);
  
  // since our fs-base doesn't yet support permissions, we need to use io.File to
  // make it executable first
  io.File.create( this.binDir + filename, 0777);

  this.copyFile(source, this.binDir + filename);

  if (this.makeBatFiles) {
    var f = fs.rawOpen(this.binDir + filename + ".bat", 'w');
    f.print(exports.batchFile);
  }
}

Installer.prototype.copyFile = function(from, to) {
  var s_fh = fs.rawOpen(from, 'r'),
      d_fh = fs.rawOpen(to, 'w');

  var blob = s_fh.readBinary();
  while (blob.length) {
    d_fh.write(blob);
    blob = s_fh.readBinary();
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
