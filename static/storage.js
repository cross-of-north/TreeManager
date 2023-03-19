/**
 * Server-backed storage for tree data.
 */

const Storage = {

    // base REST API path
    apiUrl: "/api/",

    // logger object
    log: undefined,

    // sets logger object
    setLog: function( log_ ) {
        this.log = log_;
    },

    // executes a query to the server
    query: async function( url, method ) {
        let init = {
            method: method,
        };
        let response;
        try {
            response = await fetch(this.apiUrl + url, init);
        } catch (e) {
            // network errors are thrown
            response = {
                ok: false,
                status: "Network error",
                statusText: e.toString(),
            }
        }
        if ( response.ok ) {
            this.log.clear();
        } else {
            this.log.error( response.status + ": " + response.statusText );
        }
        return response.ok ? JSON.parse( await response.text() ) : undefined;
    },

    // Add node query.
    // PUT /api/nodes/<parent_ID>
    // Returns ID of the new node.
    // Calling with parentId="" adds a root node without parents.
    addNode: async function( parentId ) {
        this.log.info( "Updating server data...", true );
        if ( !parentId.length ) {
            parentId = "0";
        }
        const o = await this.query( "nodes/" + parentId, "PUT" );
        return o === undefined ? undefined : o.id;
    },

    // Remove node query.
    // DELETE /api/nodes/<ID_to_delete>
    // Calling with id="" clears a whole tree.
    removeNode: async function( id ) {
        this.log.info( "Updating server data...", true );
        if ( !id.length ) {
            id = "0";
        }
        const o = await this.query( "nodes/" + id, "DELETE" );
        return o !== undefined;
    },

    // Get a whole tree query.
    // GET /api/nodes/0
    // JSON result format: [[node_id,parent_id],[node_id,parent_id],...] .
    // It is guaranteed that the parent_id is always a reference to one of the preceding elements.
    getAllNodes: async function() {
        this.log.info( "Loading tree from server...", true );
        return this.query( "nodes/0", "GET" );
    },

}