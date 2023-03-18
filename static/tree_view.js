const TreeView = {

  flushRowPadding: function( row ) {
      if ( row.left_padding > 0 ) {
        row.append($('<td class="novalue" colspan="' + row.left_padding + '">&nbsp;</td>'));
      }
      row.left_padding = 0;
  },

  layoutNodeChildren: async function( treeData, node, rows, node_depth ) {
    const it = treeData.getNodeChildrenIterator( node );
    let children_depth = node_depth + 1;
    let child;
    let subtreeWidth = 0;
    while ( ( child = await it.next() ) && !child.done && ( child = child.value ) ) {
      while ( rows.length <= children_depth ) { // one row more than needed
        const newRow = $('<tr>');
        newRow.left_padding = rows.length == 0 ? 0 : rows[ rows.length - 1 ].left_padding;
        rows[ rows.length ] = newRow;
      }
      const row = rows[ node_depth ];
      subtreeWidth++;
      let childSubtreeWidth = await this.layoutNodeChildren( treeData, child, rows, children_depth );
      if ( childSubtreeWidth == 0 ) {
        // no children below
        // add padding to all rows
        for ( let rowBelowNumber = children_depth; rowBelowNumber < rows.length; rowBelowNumber++ ) {
          rows[ rowBelowNumber ].left_padding++;
        }
        childSubtreeWidth = 1;
      }
      subtreeWidth += childSubtreeWidth - 1;
      const cell = $('<td colspan="' + childSubtreeWidth + '">');
      cell.text( treeData.nodeToString( child )
      //    + "(" + childSubtreeWidth + ") [" + row.left_padding + "]"
      );
      this.flushRowPadding( row );
      row.append( cell );
    }
    return subtreeWidth;
  },

  render: async function( htmlId, treeData ) {
    const canvas = $("#" + htmlId);
    const table = $('<table>');
    const rows = [];
    const rootNode = treeData.getRoot();
    await this.layoutNodeChildren( treeData, rootNode, rows, 0 );
    rows.forEach( row => {
      if ( row.children().length > 0 ) {
        this.flushRowPadding( row );
        table.append(row);
      }
    });
    canvas.append( table );
  },

}
