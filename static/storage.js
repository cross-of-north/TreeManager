
const Storage = {

    apiUrl: "/api/",

    log: undefined,

    setLog: function( log_ ) {
        this.log = log_;
    },

    query: async function( url, method ) {
        let init = {
            method: method,
        };
        const response = await fetch( this.apiUrl + url, init );
        if ( response.ok ) {
            this.log.clear();
        } else {
            this.log.error( response.status + ": " + response.statusText );
        }
        return response.ok ? JSON.parse( await response.text() ) : undefined;
    },

    addNode: async function( parentId ) {
        this.log.info( "Updating server data...", true );
        if ( !parentId.length ) {
            parentId = "0";
        }
        const o = await this.query( "nodes/" + parentId, "PUT" );
        return o === undefined ? undefined : o.id;
    },

    removeNode: async function( id ) {
        this.log.info( "Updating server data...", true );
        if ( !id.length ) {
            id = "0";
        }
        const o = await this.query( "nodes/" + id, "DELETE" );
        return o !== undefined;
    },

    getAllNodes: async function() {
        this.log.info( "Loading tree from server...", true );
        return this.query( "nodes/0", "GET" );
    },

}