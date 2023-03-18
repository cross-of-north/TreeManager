
const TreeData = {

  // current ID format is a full path

  PATH_SEPARATOR: "/",
  ID: "i",
  CHILDREN: "c",

  data: new Map(),

  lastInternalId: 0,

  getRoot: function() {
    return this.data;
  },

  getNodeId: function( node ) {
    return node.get( this.ID );
  },

  getNodeParent: async function( node ) {
    return this.getNode( this.getNodeParentId( node ) );
  },

  getNodeParentId: function( node ) {
    return node.get( this.ID ).split( this.PATH_SEPARATOR ).slice( 0, -1 ).join( this.PATH_SEPARATOR );
  },

  getShortId: function( id ) {
    return id.split( this.PATH_SEPARATOR ).slice( -1 )[ 0 ];
  },

  nodeToString: function( node ) {
    return this.getShortId( node.get === undefined ? node : node.get( this.ID ) );
  },

  getNodeChildrenCount: async function( node ) {
    return node.get( this.CHILDREN ).size;
  },

  getNodeChildrenIterator: async function* ( node ) {
    for (let child of node.get( this.CHILDREN )) {
      yield child[ 1 ];
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
      //let newId = "local_" + Date.now() + "_" + Math.random().toString(10).substring(2);
      let newId = (++this.lastInternalId).toString(10);
      node.set( this.ID, parentNode.get( this.ID ) + this.PATH_SEPARATOR + newId );
      node.set( this.CHILDREN, new Map() );
      parentNode.get( this.CHILDREN ).set( newId, node );
    }
    return node;
  },

  removeNode: async function( nodeId ) {
    let node = ( nodeId.get === undefined ) ? await this.getNode( nodeId ) : nodeId;
    if ( node !== undefined ) {
      let parentNode = await this.getNodeParent(node);
      if (parentNode !== undefined) {
        parentNode.get(this.CHILDREN).delete( this.getShortId( this.getNodeId( node ) ) );
      }
    }
  },

  init: function() {
    this.data.set( this.ID, "" );
    this.data.set( this.CHILDREN, new Map() );
  }

}

TreeData.init();