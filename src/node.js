// @flow
import { nanoid } from "nanoid";

/*::

type NodeInitial = Node & { nodeId: string };

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

export function makeNodesMap(
  initNodes /*: NodeInitial[] */
) /*: Map<string, Node> */ {
  return new Map(
    initNodes.map(({ nodeId, ...node }) => {
      return [nodeId ?? nanoid(12), node];
    })
  );
}

export function getNode(
  nodes /*: NodeMap */,
  nodeId /*: string */
) /*: Node */ {
  const node = nodes.get(nodeId);
  if (!node) throw new Error(`can't get node ${nodeId}`);
  return node;
}

export function setNode(
  nodes /*: NodeMap */,
  nodeId /*: string */,
  node /*: Node */
) {
  nodes.set(nodeId, node);
}

export function removeNode(
  nodes /*: NodeMap */,
  nodeId /*: string */
) /*: boolean */ {
  if (nodes.has(nodeId)) {
    nodes.delete(nodeId);
    return true;
  }
  return false;
}

export function forEachNode(
  nodes /*: NodeMap */,
  action /*: (node: Node) => void */
) {
  for (let node of nodes.values()) {
    action(node);
  }
}

export function hasNode(
  nodes /*: NodeMap */,
  nodeId /*: string */
) /*: boolean */ {
  return nodes.has(nodeId);
}

export function setNodeValues(node /*: Node */, values /*: any */) {
  Object.assign(node, values);
}
