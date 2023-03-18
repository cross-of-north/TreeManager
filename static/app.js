
const App = {

    onRandomFillClick: async function() {
        await TreeData.removeAll();
        await this.randomPopulate( 20 );
        return this.render();
    },

    render: function() {
        return TreeView.render( "treeView", TreeData );
    },

    randomPopulate: async function( count ) {
        let rootNode = await TreeData.addNode("");
        const nodes = [ rootNode ];
        for ( ; count >0; count-- ) {
            nodes.push( await TreeData.addNode(
                nodes[ parseInt(Math.random().toString().substring(2)) % nodes.length ]
            ) );
        }
    },

    init: async function() {
        TreeData.setStorage( Storage );
        let rootNode = await TreeData.addNode("");
        await this.randomPopulate( 20 );

        /*
        let rootNode = await TreeData.addNode("");
        let level1Node1 = await TreeData.addNode(rootNode);
        let level1Node2 = await TreeData.addNode(rootNode);
        let level1Node3 = await TreeData.addNode(rootNode);
        let level1Node4 = await TreeData.addNode(rootNode);
        let level1Node5 = await TreeData.addNode(rootNode);
        let level2Node2 = await TreeData.addNode(TreeData.getNodeId(level1Node2));
        let level2Node4 = await TreeData.addNode(TreeData.getNodeId(level1Node4));
        let level2Node5 = await TreeData.addNode(TreeData.getNodeId(level1Node5));
        let level3Node41 = await TreeData.addNode(TreeData.getNodeId(level2Node4));
        let level3Node42 = await TreeData.addNode(TreeData.getNodeId(level2Node4));
        */

        TreeView.onInlineAddClick = function( id ) {
            TreeData.addNode(id).then( function() { App.render() } );
        }

        TreeView.onInlineRemoveClick = function( id ) {
            TreeData.removeNode(id).then( function() { App.render() } );
        }

        this.render().then();
    },

}