// track downloads
$( function() {
  $( "a[href^='/downloads']" ).bind( "click", function() {
    // check pageTracker is available first
    if ( pageTracker ) {
      pageTracker._trackPageview( this.href );
    }
  } );
} );
