$( function() {
  // detect OS
  if ( navigator.platform.indexOf( 'Mac' ) != -1 ) $( '#mac-os-x' ).addClass( 'detected' );
  if ( navigator.platform.indexOf( 'Win' ) != -1 ) $( '#windows' ).addClass( 'detected' );
  if ( navigator.platform.indexOf( 'Linux' ) != -1 ) $( '#linux' ).addClass( 'detected' );

  // hide everything but the detected OS, if one was found
  $( '#installation .detected' ).each( function() {
    var oses = [];

    // build links to reveal each of the OS blocks
    $( '#installation div' ).each( function() {
      ( function( os ) {
        var link = $( '<a>' )
          .text( $( 'h3 em', os ).text() )
          .attr( 'href', '#' + os.id )
          .click( function( e ) {
            e.preventDefault();
            $( '#installation div' ).hide();
            $( os ).show();
          } );
        oses.push( link );
      } )( this );
    } ).not( this ).hide();

    // stick the alternative OS links somewhere visible
    $( '<p>' )
      .attr( 'id', 'os-alternatives' )
      .text( 'Need instructions for ' )
      .append( oses[ 0 ] )
      .append( ', ' )
      .append( oses[ 1 ] )
      .append( ' or ' )
      .append( oses[ 2 ] )
      .append( '?' )
      .appendTo( '#installation' );
  } );
} );
