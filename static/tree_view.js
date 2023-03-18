const TreeView = {

  onInlineAddClick: function( id ) {
    alert( "add to " + id )
  },

  onInlineRemoveClick: function( id ) {
    alert( "remove " + id )
  },

  flushRowPadding: function( row ) {
      if ( row.left_padding > 0 ) {
        row.append($('<td class="novalue" colspan="' + row.left_padding + '">&nbsp;</td>'));
      }
      row.left_padding = 0;
  },

  decorateCell: function( cell, nodeId ) {
      if ( nodeId.length > 0 ) {
        const inlineRemoveButton = $("<button class='inlineRemove'>[&#8211;]</button>");
        inlineRemoveButton.click( () => this.onInlineRemoveClick( nodeId ) );
        cell.prepend( inlineRemoveButton );
      }
      const inlineAddButton = $("<button class='inlineAdd'>[+]</button>");
      inlineAddButton.click( () => this.onInlineAddClick( nodeId ) );
      cell.append( inlineAddButton );
      cell.hover(
          ( event ) => {
            if ( this.currentHover ) {
              this.currentHover.css( "visibility", "hidden" );
            }
            this.currentHover = $(event.target).find("button");
            this.currentHover.css( "visibility", "visible" );
          },
          ( event ) => $(event.target).find("button").css( "visibility", "hidden" )
      );
  },

  layoutNodeChildren: async function( treeData, node, rows, node_depth ) {
    const it = treeData.getNodeChildrenIterator( node );
    const children_depth = node_depth + 1;
    let child;
    let subtreeWidth = 0;
    while ( ( child = await it.next() ) && !child.done && ( child = child.value ) ) {
      while ( rows.length <= children_depth ) { // one row more than needed
        const newRow = $('<tr>');
        newRow.left_padding = rows.length === 0 ? 0 : rows[ rows.length - 1 ].left_padding;
        rows[ rows.length ] = newRow;
      }
      const row = rows[ node_depth ];
      subtreeWidth++;
      let childSubtreeWidth = await this.layoutNodeChildren( treeData, child, rows, children_depth );
      if ( childSubtreeWidth === 0 ) {
        // no children below
        // add padding to all rows
        for ( let rowBelowNumber = children_depth; rowBelowNumber < rows.length; rowBelowNumber++ ) {
          rows[ rowBelowNumber ].left_padding++;
        }
        childSubtreeWidth = 1;
      }
      subtreeWidth += childSubtreeWidth - 1;
      const cell = $('<td colspan="' + childSubtreeWidth + '">');
      const parentId = treeData.getNodeParentId( child );
      cell.text(
          //treeData.nodeToString( child )
          "P:" + ( parentId.length === 0 ? "NONE" : treeData.nodeToString( parentId ) ) + "\xA0" +
          "ID:" + treeData.nodeToString( child )
      //    + "(" + childSubtreeWidth + ") [" + row.left_padding + "]"
      );
      this.decorateCell( cell, treeData.getNodeId( child ) );
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
    const width = await this.layoutNodeChildren( treeData, rootNode, rows, 0 );
    const th = $("<th colspan='" + width + "'>Tree Nodes</th>");
    this.decorateCell( th, "" );
    table.append($("<tr>")).append($("<th>Depth</th>")).append(th);
    rows.forEach( ( row, index ) => {
      if ( row.children().length > 0 ) {
        this.flushRowPadding( row );
        row.prepend("<td>" + index + "</td>")
        table.append(row);
      }
    });
    canvas.empty();
    canvas.append( table );
  },

}
