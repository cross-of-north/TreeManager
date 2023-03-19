
const Log = {

    write: function( s ) {
        const el = $("#messages");
        el.text( s );
        return el;
    },

    info: function( s, bWait ) {
        this.clear();
        return this.write( s ).addClass( "info" + ( bWait ? " blink" : "" ) );
    },

    error: function( s ) {
        this.clear();
        return this.write( s ).addClass( "error" );
    },

    clear: function() {
        return this.write( "\xA0" ).
            removeClass( "error" ).
            removeClass( "info" ).
            removeClass( "blink" );
    },
}