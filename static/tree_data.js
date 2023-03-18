
const TreeData = {

  // current ID format is a full path

  PATH_SEPARATOR: "/",
  ID: "i",
  CHILDREN: "c",

  data: new Map(),

  lastInternalId: 0,

  storage: undefined,

  setStorage: function( storage_ ) {
    this.storage = storage_;
  },

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
      const arPath = String(id).split(this.PATH_SEPARATOR);
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
    const parentNode = await this.getNode( parentId );
    if ( parentNode !== undefined ) {
      //let newId = "local_" + Date.now() + "_" + Math.random().toString(10).substring(2);
      let newId = "~" + (++this.lastInternalId).toString(10);
      const storageNewId = await this.storage.addNode( this.getShortId(this.getNodeId(parentNode)) );
      if ( storageNewId !== undefined ) {
        newId = storageNewId.toString();
      }
      node = new Map();
      node.set(this.ID, parentNode.get(this.ID) + this.PATH_SEPARATOR + newId);
      node.set(this.CHILDREN, new Map());
      parentNode.get(this.CHILDREN).set(newId, node);
    }
    return node;
  },

  removeNode: async function( nodeId ) {
    const node = (nodeId.get === undefined) ? await this.getNode(nodeId) : nodeId;
    const shortId = this.getShortId(this.getNodeId(node));
    if ( await this.storage.removeNode( shortId ) ) {
      if (node !== undefined) {
        const parentNode = await this.getNodeParent(node);
        if (parentNode !== undefined) {
          parentNode.get(this.CHILDREN).delete(this.getShortId(this.getNodeId(node)));
        }
      }
    }
  },

  removeAll: async function() {
    await this.storage.removeNode( "" );
    this.data = new Map();
    this.init();
  },

  init: function() {
    this.data.set( this.ID, "" );
    this.data.set( this.CHILDREN, new Map() );
  }

}

TreeData.init();