
const Storage = {

    apiUrl: "/api/",

    query: async function( url, method ) {
        let init = {
            method: method,
        };
        const response = await fetch( this.apiUrl + url, init );
        return response.ok ? JSON.parse( await response.text() ) : undefined;
    },

    addNode: async function( parentId ) {
        if ( !parentId.length ) {
            parentId = "0";
        }
        const o = await this.query( "nodes/" + parentId, "PUT" );
        return o === undefined ? undefined : o.id;
    },

    removeNode: async function( id ) {
        if ( !id.length ) {
            id = "0";
        }
        const o = await this.query( "nodes/" + id, "DELETE" );
        return o !== undefined;
    },

    getAllNodes: async function() {
        return this.query( "nodes/0", "GET" );
    },

}