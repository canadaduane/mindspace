// @flow
import { nanoid } from "nanoid";
import { orbSize } from "../constants.js";

/*::
import { Vector2 } from "../math/vector2.js";

export type NodeInitial = Node & { nodeId: string };

export type Node = {
  x: number; // The global X coordinate for this node
  y: number; // The global Y coordinate for this node
  color: string; // The color chosen for this node
  text: string; // The text stored at this node
  spiral: number; // A number that stores the "spiral step" for new nodes
  dependents: Dependent[]; // A list of dependent shapes
};

export type Dependent = {
  shapeId: string; // The ID of the shape that depends on the node
  attrs: Record<string, string>; // A mapping from Node attributes to Node attributes
};

export type NodesMap = Map<string, Node>;
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

export const createNode =
  (nodes /*: NodesMap */) /*: (node: Node) => string */ =>
  (node /*: Node */) => {
    const nodeId = nanoid(12);
    setNode(nodes)(nodeId, node);
    return nodeId;
  };

export const getNode =
  (nodes /*: NodesMap */) /*: (nodeId: string) => Node */ => (nodeId) => {
    const node = nodes.get(nodeId);
    if (!node) throw new Error(`can't get node ${nodeId}`);
    return node;
  };

export const setNode =
  (nodes /*: NodesMap */) /*: (nodeId: string, node: Node) => NodesMap */ =>
  (nodeId, node) =>
    nodes.set(nodeId, node);

export const hasNode =
  (nodes /*: NodesMap */) /*: (nodeId: string) => boolean */ => (nodeId) =>
    nodes.has(nodeId);

export const removeNode =
  (nodes /*: NodesMap */) /*: (nodeId: string) => boolean */ => (nodeId) => {
    if (nodes.has(nodeId)) {
      return nodes.delete(nodeId);
    }
    return false;
  };

export function setNodeValues(node /*: Node */, values /*: any */) /*: Node */ {
  Object.assign(node, values);
  return node;
}

export const findNodeAtPosition =
  (nodes /*: NodesMap */) /*: (pos: Vector2) => Node | void */ => (pos) => {
    for (let [nodeId, node] of nodes.entries()) {
      // $FlowIgnore
      if (pos.distanceTo(node) <= orbSize / 2) {
        return node;
      }
    }
  };

/*::
export type NodesBundle = {
  nodes: NodesMap,

  createNode: ReturnType<typeof createNode>,
  getNode: ReturnType<typeof getNode>,
  hasNode: ReturnType<typeof hasNode>,
  setNode: ReturnType<typeof setNode>,
  removeNode: ReturnType<typeof removeNode>,
  findNodeAtPosition: ReturnType<typeof findNodeAtPosition> 
}
*/

export function makeNodes(
  initNodes /*: NodeInitial[] */ = []
) /*: NodesBundle */ {
  const nodes = makeNodesMap(initNodes);

  return {
    nodes,

    createNode: createNode(nodes),
    getNode: getNode(nodes),
    hasNode: hasNode(nodes),
    setNode: setNode(nodes),
    removeNode: removeNode(nodes),
    findNodeAtPosition: findNodeAtPosition(nodes),
  };
}
