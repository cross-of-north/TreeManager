/**
 * Tree memory storage/cache.
 * Almost every method is async, allowing for loading data from server on demand.
 * Nodes are identified by a long ID containing a full path to the node,
 * for example /1/2/3/5. The last part of ID (for example, 5) is a short ID -
 * an actual database entity ID.
 * Node is represented as a Map:
 * (
 *    i => <this node long ID>,
 *    c => Map of ( <child node short ID> => <child node object>, ... )
 * )
 * The flat Map of <node short ID> => <node object> is created only for a short time
 * to initially load tree from the server.
 */

const TreeData = {

  // long id separator
  PATH_SEPARATOR: "/",

  // Map key of long ID field
  ID: "i",

  // Map key of Map of children field
  CHILDREN: "c",

  // A root node
  data: new Map(),

  // not used
  lastInternalId: 0,

  // An underlying storage
  storage: undefined,

  // sets storage object
  setStorage: function( storage_ ) {
    this.storage = storage_;
  },

  // returns a root node
  getRoot: function() {
    return this.data;
  },

  // returns the long ID of a node
  getNodeId: function( node ) {
    return node.get( this.ID );
  },

  // returns the parent node of a node
  getNodeParent: async function( node ) {
    return this.getNode( this.getNodeParentId( node ) );
  },

  // returns the long ID of a parent node of a node
  getNodeParentId: function( node ) {
    return node.get( this.ID ).split( this.PATH_SEPARATOR ).slice( 0, -1 ).join( this.PATH_SEPARATOR );
  },

  // returns the short ID part of a long ID
  getShortId: function( id ) {
    return id.split( this.PATH_SEPARATOR ).slice( -1 )[ 0 ];
  },

  // returns default node string representation (short ID)
  // can process node object and node long ID
  nodeToString: function( node ) {
    return this.getShortId( node.get === undefined ? node : node.get( this.ID ) );
  },

  // not used
  // getNodeChildrenCount: async function( node ) {
  //   return node.get( this.CHILDREN ).size;
  // },

  // returns an iterator to child node objects
  getNodeChildrenIterator: async function* ( node ) {
    for (let child of node.get( this.CHILDREN )) {
      yield child[ 1 ];
    }
  },

  // returns a child of the node with a short ID specified
  getNodeChild: async function( node, id ) {
    return node.get( this.CHILDREN ).get( id );
  },

  // returns a node by a long ID (fast)
  getNode: async function( id ) {
    if ( id.get === undefined || id.get( this.ID ) === undefined ) {
      // the input value is not a node
      // searching a node object descending from a tree root
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
      // the input value is not an ID but a node
      return id;
    }
  },

  // returns a node by a short ID (slow)
  // recursively searches the whole tree for the short ID
  findNodeByShortId: async function( shortId, rootNode ) {
    let node;
    if ( rootNode === undefined ) {
      rootNode = this.data;
    }
    if ( String( shortId ).length === 0 ) {
      // empty short ID is always a tree root
      node = this.data;
    } else {
      // searching for a child with a short ID specified
      const children = rootNode.get(this.CHILDREN);
      node = children.get(shortId);
      if (node === undefined) {
        // no such child, searching among every child's children
        for (let child of children) {
          if ((node = await this.findNodeByShortId(shortId, child[1])) !== undefined) {
            break;
          }
        }
      } else {
        // found
      }
    }
    return node;
  },

  // creates Node object in memory
  createNode: function( parentNode, newId ) {
    const node = new Map();
    node.set(this.ID, parentNode.get(this.ID) + this.PATH_SEPARATOR + newId);
    node.set(this.CHILDREN, new Map());
    parentNode.get(this.CHILDREN).set(newId, node);
    return node;
  },

  // adds a new child node to the parent specified
  addNode: async function( parentId ) {
    let node = undefined;
    const parentNode = await this.getNode( parentId );
    if ( parentNode !== undefined ) {
      // get a new node ID from the server
      const storageNewId = await this.storage.addNode( this.getShortId(this.getNodeId(parentNode)) );
      if ( storageNewId !== undefined ) {
        // create new node in memory
        let newId = storageNewId.toString();
        node = this.createNode( parentNode, newId );
      }
    }
    return node;
  },

  // removes a node
  removeNode: async function( nodeId ) {
    const node = (nodeId.get === undefined) ? await this.getNode(nodeId) : nodeId;
    const shortId = this.getShortId(this.getNodeId(node));
    // remove a node from a server
    if ( await this.storage.removeNode( shortId ) ) {
      if (node !== undefined) {
        const parentNode = await this.getNodeParent(node);
        if (parentNode !== undefined) {
          // remove a node from memory
          parentNode.get(this.CHILDREN).delete(this.getShortId(this.getNodeId(node)));
        }
      }
    }
  },

  // removes all nodes
  removeAll: async function() {
    await this.storage.removeNode( "" );
    this.data = new Map();
    this.init();
  },

  // loads a tree from a server
  loadFromStorage: async function() {
    this.data = new Map();
    this.init();
    // get data from a server
    const nodes = await this.storage.getAllNodes();
    const node_map = new Map(); // a temporary Map of node objects by short ID
    // adding the root node to the Map
    node_map.set("0", this.data);
    if ( nodes !== undefined ) {
      // JSON result format: [[node_id,parent_id],[node_id,parent_id],...] .
      for ( let nodeData of nodes ) {
        // for every node data loaded
        const nodeId = "" + nodeData[0];
        const parentId = "" + nodeData[1];
        // searching parent
        // It is guaranteed that the parent_id is always
        // a reference to one of the preceding elements.
        const parentNode = node_map.get( parentId );
        if ( parentNode !== undefined ) {
          const node = this.createNode( parentNode, nodeId );
          node_map.set(nodeId, node);
        }
      }
    }
  },

  init: function() {
    this.data.set( this.ID, "" );
    this.data.set( this.CHILDREN, new Map() );
  }

}

TreeData.init();