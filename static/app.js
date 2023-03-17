const TreeData = {

  // current ID format is a full path

  PATH_SEPARATOR: "/",
  ID: "i",
  CHILDREN: "c",

  data: new Map(),

  getNodeId: function( node ) {
    return node.get( this.ID );
  },

  // https://davidwalsh.name/async-generators
  doGetNodeChildren: function( node, context ) {
    let internalIterator = new Promise( (resolve,reject) => {
      const it = context.it;
      delete context.it;
      it.next( node.get( this.CHILDREN ) );
    } );
    setTimeout( () => internalIterator.resolve(), 0 );
  },

  getNodeChildrenWrapper: function* ( node, context ) {
    yield this.doGetNodeChildren( node, context.it );
  },

  iterateNodeChildren: function* ( node ) {
    let context = {};
    context.it = this.getNodeChildrenWrapper( node, context );
    while ( context.it !== undefined ) {
      let childrenBatch = context.it.next();
      for ( let child of childrenBatch ) {
        yield child;
      }
    }
  },

  getNodeChild: async function( node, id ) {
    return node.get( this.CHILDREN ).get( id );
  },

  getNode: async function( id ) {
    if ( id.get === undefined || id.get( this.ID ) === undefined ) {
      let arPath = String(id).split(this.PATH_SEPARATOR);
      let node = this.data;
      for (const nodeId of arPath) {
        if (nodeId.length > 0) {
          node = await this.getNodeChild( node, nodeId );
          if (node === undefined) {
            break;
          }
        }
      }
      return node;
    } else {
      return id;
    }
  },

  addNode: async function( parentId ) {
    let node = undefined;
    let parentNode = await this.getNode( parentId );
    if ( parentNode !== undefined ) {
      node = new Map();
      let newId = "local_" + Date.now() + "_" + Math.random().toString(10).substring(2);
      node.set( this.ID, parentNode.get( this.ID ) + this.PATH_SEPARATOR + newId );
      node.set( this.CHILDREN, new Map() );
      parentNode.get( this.CHILDREN ).set( newId, node );
    }
    return node;
  },

  init: function() {
    this.data.set( this.ID, "" );
    this.data.set( this.CHILDREN, new Map() );
  }

}

TreeData.init();