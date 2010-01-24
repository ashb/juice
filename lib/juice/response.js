/**
 *  class Juice.Response
 *
 *  A class representing state about the response to a request. Its internal
 *  fields closely resemble those of a JSGI response.
 **/

var Response = exports.Response = function Response( ctx ) {
  this.ctx = ctx;
  this.headers = {};
}

/**
 *  Juice.Response#status -> Number
 *
 *  HTTP status code for the response. If it 0 or not present then the default
 *  for the request will be used (usually 200, but might be different for
 *  special cases)
 **/

/**
 *  Juice.Response#body -> Array
 *
 *  Content of the response. If this is set then Juice's default rendinger of
 *  a template or JSON will be by-passed.
 **/

/**
 *  Juice.Response#headers -> Object
 *
 *  HTTP response headers. When merging, if a header is present already, its
 *  default value will not be used (i.e. the default value is not appeended to
 *  the existing header.)
 **/

/**
 *  Juice.Response#file -> String
 *
 *  Name of a file to send as the content of the response. If this field is 
 *  present then [[Juice.Response#body]] will be ignored as will the default
 *  template rendering.
 *
 *  If there is no `last-modified` or `content-type` headers then they will be
 *  populated.
 **/

/**
 *  Juice.Response#template -> String
 *
 *  Override the default template to be rendered for this response. 
 *
 *  If [[Juice.Response#body]] or [[Juice.Response#file]] are set then this
 *  field will be ignored.
 **/

/**
 *  Juice.Response#merge( defaults ) -> Juice.Response
 *  - defaults (Object): defaults to merge in.
 *
 *  Merge the default status, headers and body into the current state of the
 *  response. If any fields are already present (and truthful) they will be
 *  used. Otherwise the appropriate field from `defaults` is used.
 *
 *  Returns `this`;
 **/
Response.prototype.merge = function( defs ) {
  if ( !this.stats ) this.status = defs.status;
  if ( !this.body ) this.body = defs.body;

  if ( typeof this.headers != "object" ) {
    // A bit of a sanity check
    throw new TypeError("Juice.Response#headers must be an object");
  }
  else {
    // Merge headers in
    for ( var h in defs.headers ) {
      if ( h in this.headers == false )
        this.headers[ h ] = defs.headers[ h ];
    }
  }

  return this;
}

Response.redirect = function( url, code ) {
  // TODO: should we call this.ctx.absUrlFor( url ) here?
  this.headers[ 'location' ] = url;
  if ( code !== undefined ) this.status = code;
}
