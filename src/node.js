import { nanoid } from "nanoid";

/*+
type Node = {
  x: number; // The global X coordinate for this node
  y: number; // The global Y coordinate for this node
  color: string; // The color chosen for this node
  text: string; // The text stored at this node
  spiral: number; // A number that stores the "spiral step" for new nodes
  dependents: Dependent[]; // A list of dependent shapes
};

type Dependent = {
  shapeId: number; // The ID of the shape that depends on the node
  attrs: Record<string, string>; // A mapping from Node attributes to Shape attributes
};

type NodeMap = Map<string, Node>;

*/

export function makeNodesMap(initNodes /*: Node[] */) {
  return new Map(
    initNodes.map(({ nodeId, ...node }) => {
      return [nodeId ?? nanoid(12), node];
    })
  );
}

export function getNode(nodeId /*: string */, nodes /*: NodeMap */) {
  const node = nodes.get(nodeId);
  if (!node) throw new Error(`can't get node ${nodeId}`);
  return node;
}

export function hasNode(nodeId /*: string */, nodes /*: NodeMap */) {
  return nodes.has(nodeId);
}

export function setNode(node /*: Node */, values) {
  Object.assign(node, values);
}
