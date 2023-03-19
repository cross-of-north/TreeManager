/**
 * Table-based visual representation of a tree.
 */

const TreeView = {

  // inline add node button click default callback
  onInlineAddClick: function( id ) {
    alert( "add to " + id )
  },

  // inline remove node button click default callback
  onInlineRemoveClick: function( id ) {
    alert( "remove " + id )
  },

  // adds as much empty <td>s as needed to the <tr>
  flushRowPadding: function( row ) {
    if ( row.left_padding > 0 ) {
      row.append($('<td class="novalue" colspan="' + row.left_padding + '">&nbsp;</td>'));
    }
    row.left_padding = 0;
  },

  // adds interactive elements to the <td> representing a node
  decorateCell: function( cell, nodeId ) {

    // node remove button
    if ( nodeId.length > 0 ) {
      // for non-root nodes only
      const inlineRemoveButton = $("<button class='inlineRemove'>[&#8211;]</button>");
      inlineRemoveButton.click( () => this.onInlineRemoveClick( nodeId ) );
      cell.prepend( inlineRemoveButton );
    }

    // node add button
    const inlineAddButton = $("<button class='inlineAdd'>[+]</button>");
    inlineAddButton.click( () => this.onInlineAddClick( nodeId ) );
    cell.append( inlineAddButton );

    // show buttons on hover
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

  // Creates table structures to represent a tree node.
  // Returns a width (in <td>s) needed to render this node and all its children.
  layoutNodeChildren: async function(
      treeData, // tree data object
      node, // current node
      rows, // <tr>s
      node_depth // current node distance from the root
  ) {

    // current node children distance from the root
    const children_depth = node_depth + 1;

    // iterating over node children

    const it = treeData.getNodeChildrenIterator( node );
    let child;
    let subtreeWidth = 0;

    while ( ( child = await it.next() ) && !child.done && ( child = child.value ) ) {

      // adding more <tr>s if needed to represent tree depth
      // the most deep <tr> is redundant, it serves just to accumulates padding value
      while ( rows.length <= children_depth ) {
        const newRow = $('<tr>');
        // padding for the new row is the same as for the preceding row
        // because first child left border is always exactly below a parent left border
        newRow.left_padding = rows.length === 0 ? 0 : rows[ rows.length - 1 ].left_padding;
        rows[ rows.length ] = newRow;
      }

      const row = rows[ node_depth ];

      // we need at least one <td> to render this child itself
      subtreeWidth++;

      // rendering children of the current child
      // obtaining width of subtree
      let childSubtreeWidth = await this.layoutNodeChildren( treeData, child, rows, children_depth );

      if ( childSubtreeWidth === 0 ) {
        // subtree is zero-width, so no sub-children below
        // adding padding to all rows below, because this is a dead end child
        for ( let rowBelowNumber = children_depth; rowBelowNumber < rows.length; rowBelowNumber++ ) {
          rows[ rowBelowNumber ].left_padding++;
        }
        // but we still need at least one <td> to render this child itself
        childSubtreeWidth = 1;
      }

      // we need at least one <td> to render this child itself (already counted)
      // and we need to place not less than childSubtreeWidth <td>s right below
      subtreeWidth += childSubtreeWidth - 1;

      // creating <td> with a width to span over all sub-children
      const cell = $('<td colspan="' + childSubtreeWidth + '">');

      // rendering node text
      const parentId = treeData.getNodeParentId( child );
      cell.text(
          //treeData.nodeToString( child )
          "P:" + ( parentId.length === 0 ? "NONE" : treeData.nodeToString( parentId ) ) + "\xA0" +
          "ID:" + treeData.nodeToString( child )
          // + "(" + childSubtreeWidth + ") [" + row.left_padding + "]"
      );

      // adding interactivity
      this.decorateCell( cell, treeData.getNodeId( child ) );

      // before adding non-empty <td> child node representation to <tr>,
      // we need to render all empty space to the left of a new <td>
      this.flushRowPadding( row );

      // append <td> to <tr>
      row.append( cell );
    }

    // total width of all children's subtrees
    return subtreeWidth;
  },

  // renders treeData as a table contained in #htmlId
  render: async function( htmlId, treeData ) {
    const canvas = $("#" + htmlId);
    const table = $('<table>');
    const rows = [];

    // recursive rendering starting from an invisible root node
    const rootNode = treeData.getRoot();
    const width = await this.layoutNodeChildren( treeData, rootNode, rows, 0 );

    // rendering table header
    // the header above nodes is decorated with an "add node" button
    // to add nodes at the highest level
    const th = $("<th colspan='" + width + "'>Tree Nodes</th>");
    this.decorateCell( th, "" );
    table.append($("<tr>")).append($("<th>Depth</th>")).append(th);

    // appending table rows rendered above
    rows.forEach( ( row, index ) => {
      if ( row.children().length > 0 ) {

        // filling a distance between a last node <td> and the right table border
        this.flushRowPadding( row );

        // every row contains additional <td> with a depth value
        row.prepend("<td>" + index + "</td>")

        table.append(row);
      }
    });

    canvas.empty();
    canvas.append( table );
  },

}
