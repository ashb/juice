exports.install = function() {
  // Set path to always use local versoin of juice/installer
  var [,dir] = module.uri.replace(/^file:\/\//, '').match(/^(.*\/)[^\/]+$/);
  require.paths.unshift(dir + 'lib');

  // Make sure the bin/juice is up to date
  require('./skeleton/build-juice-script').makeScript();
  require('./lib/juice/installer').install(module.id)
}

if (require.main === module)
  exports.install();
