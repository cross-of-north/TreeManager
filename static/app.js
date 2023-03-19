/**
 * Main application object.
 */
const App = {

    /**
     * "Add Node To" button click handler.
     */
    onAddToClick: async function() {
        Log.clear();
        const id = $("#addToInput").val();
        const node = await TreeData.findNodeByShortId( id );
        if ( node === undefined ) {
            Log.error( "Node with id " + id + " is not found." );
        } else {
            await TreeData.addNode( node );
            App.render().then();
        }
    },

    /**
     * "Random Fill" button click handler.
     */
    onRandomFillClick: async function() {
        // TODO: batch mode
        Log.clear();
        await TreeData.removeAll();
        await this.randomPopulate( $("#randomFillInput").val() * 1 );
        return this.render();
    },

    /**
     * Redraws the tree visual representation.
     */
    render: function() {
        return TreeView.render( "treeView", TreeData );
    },

    /**
     * Creates a new tree of N random nodes.
     * The old tree is deleted.
     */
    randomPopulate: async function( count ) {
        let rootNode = await TreeData.addNode("");
        const nodes = [ rootNode ];
        for ( ; count >0; count-- ) {
            nodes.push( await TreeData.addNode(
                nodes[ parseInt(Math.random().toString().substring(2)) % nodes.length ]
            ) );
        }
    },

    /**
     * Application initialization.
     */
    init: async function() {

        // link objects together
        Storage.setLog( Log );
        TreeData.setStorage( Storage );

        // load a saved tree from the server
        await TreeData.loadFromStorage();

        // register a handler for inline node add button
        TreeView.onInlineAddClick = function( id ) {
            TreeData.addNode(id).then( function() { App.render() } );
        }

        // register a handler for inline node remove button
        TreeView.onInlineRemoveClick = function( id ) {
            TreeData.removeNode(id).then( function() { App.render() } );
        }

        // keyboard "Add To" value submit support
        $('#addToInput').keypress( function(e) {
            if ( e.keyCode === 13 ) {
                $('#addToButton').click();
            }
        } );

        // keyboard "Random Fill" value submit support
        $('#randomFillInput').keypress( function(e) {
            if ( e.keyCode === 13 ) {
                $('#randomFillButton').click();
            }
        } );

        // initial rendering of the tree loaded from the server
        this.render().then();
    },

}