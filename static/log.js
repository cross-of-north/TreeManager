
const Log = {

    write: function( s ) {
        const el = $("#messages");
        el.text( s );
        return el;
    },

    info: function( s, bWait ) {
        const el = this.write( s ).
            css( "background-color", "default" ).
            css( "text-color", "default" ).
            css( "font-weight", "default" );
        if ( bWait ) {
            el.addClass("blink");
        }
    },

    error: function( s ) {
        this.write( s ).
            css( "background-color", "default" ).
            css( "color", "red" ).
            css( "font-weight", "bold" ).
            removeClass("blink");
    },

    clear: function() {
        this.info( "\xA0" );
    },
}