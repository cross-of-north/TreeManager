
const Storage = {

    apiUrl: "/api/",

    query: async function( url, o, method ) {
        let init = {
            method: method,
        };
        if ( method === "POST" || method === "PUT" ) {
            init.body = JSON.stringify(o);
        }
        const response = await fetch( this.apiUrl + url, init );
        return response.ok ? JSON.parse( await response.text() ) : undefined;
    },

    addNode: async function( parentId ) {
        if ( !parentId.length ) {
            parentId = "0";
        }
        const o = await this.query( "nodes/" + parentId, {}, "PUT" );
        return o === undefined ? undefined : o.id;
    },

    removeNode: async function( id ) {
        if ( !id.length ) {
            id = "0";
        }
        const o = await this.query( "nodes/" + id, {}, "DELETE" );
        return o !== undefined;
    },

}