const Template = require( "Template" ).Template;

exports.View = function( conf ) {
  this.tt = new Template( {
    INCLUDE_PATH: conf.paths || []
  } );

  return this;
}

exports.View.prototype.render = function( template, stash ) {
  return this.tt.process( template, stash );
}
