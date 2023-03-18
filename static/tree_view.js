const TreeView = {

  layoutNodeChildren: async function( treeData, node, rows, node_depth ) {
    const it = treeData.getNodeChildrenIterator( node );
    let children_depth = node_depth + 1;
    let child;
    while ( ( child = await it.next() ) && !child.done && ( child = child.value ) ) {
      if ( rows.length < children_depth ) {
        rows[ node_depth ] = $('<tr>');
      }
      const row = rows[ node_depth ];
      const cell = $('<td colspan="' + await treeData.getNodeChildrenCount( child ) + '">');
      cell.text( treeData.nodeToString( child ) );
      row.append( cell );
      await this.layoutNodeChildren( treeData, child, rows, children_depth );
    }
  },

  render: async function( htmlId, treeData ) {
    const canvas = $("#" + htmlId);
    const table = $('<table>');
    const rows = [];
    const rootNode = treeData.getRoot();
    await this.layoutNodeChildren( treeData, rootNode, rows, 0 );
    rows.forEach( row => {
      table.append( row );
    });
    canvas.append( table );
  },

}
