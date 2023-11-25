// @flow
import { jotCircleRadius } from "../constants.js";
import { nonNull, makeId } from "../utils.js";

/*::
import { Vector2 } from "../math/vector2.js";

export type NodeConstructor = {
  nodeId?: string;
  ...Pick<Node, 'x' | 'y'>;
  ...Partial<Omit<Node, 'x' | 'y'>>;
}

export type Node = {
  x: number; // The global X coordinate for this node
  y: number; // The global Y coordinate for this node
  color: string; // The color chosen for this node
  spiral: number; // A number that stores the "spiral step" for new nodes
  dependents: Map<string, DependentFigureAttrs>; // A map of dependent figures' attributes
};

export type DependentFigureAttrs = Record<string, string>;

export type NodesMap = Map<string, Node>;
*/

export const constructNode = (
  { nodeId, ...params } /*: NodeConstructor */
) /*: Node */ => ({
  ...{
    // Default values
    color: "white",
    spiral: 0,
    dependents: new Map(),
  },
  ...params,
});

export function makeNodesMap(
  nodes /*: NodeConstructor[] */
) /*: Map<string, Node> */ {
  return new Map(
    nodes.map(({ nodeId, ...node }) => [makeId(nodeId), constructNode(node)])
  );
}

export const createNode =
  (
    nodes /*: NodesMap */
  ) /*: (initNode: NodeConstructor) => { nodeId: string, node: Node } */ =>
  ({ nodeId, ...initNode }) => {
    const newNodeId = makeId(nodeId);
    const newNode = constructNode(initNode);
    setNode(nodes)(newNodeId, newNode);
    return { nodeId: newNodeId, node: newNode };
  };

export const getNode_ =
  (nodes /*: NodesMap */) /*: (nodeId: string) => ?Node */ => (nodeId) =>
    nodes.get(nodeId);

export const getNode =
  (nodes /*: NodesMap */) /*: (nodeId: string) => Node */ => (nodeId) =>
    nonNull(nodes.get(nodeId), "null nodeId");

export const setNode =
  (nodes /*: NodesMap */) /*: (nodeId: string, node: Node) => NodesMap */ =>
  (nodeId, node) =>
    nodes.set(nodeId, node);

export const hasNode =
  (nodes /*: NodesMap */) /*: (nodeId: string) => boolean */ => (nodeId) =>
    nodes.has(nodeId);

export const deleteNode =
  (nodes /*: NodesMap */) /*: (nodeId: string) => boolean */ => (nodeId) =>
    nodes.delete(nodeId);

export function setNodeValues(node /*: Node */, values /*: any */) /*: Node */ {
  Object.assign(node, values);
  return node;
}

export const findNodeAtPosition =
  (nodes /*: NodesMap */) /*: (pos: Vector2) => ?Node */ => (pos) => {
    for (let [nodeId, node] of nodes.entries()) {
      // $FlowIgnore
      if (pos.distanceTo(node) <= jotCircleRadius) {
        return node;
      }
    }
  };

/*::
export type NodesBundle = {
  nodes: NodesMap,

  createNode: ReturnType<typeof createNode>,
  getNode_: ReturnType<typeof getNode_>,
  getNode: ReturnType<typeof getNode>,
  hasNode: ReturnType<typeof hasNode>,
  setNode: ReturnType<typeof setNode>,
  deleteNode: ReturnType<typeof deleteNode>,
  findNodeAtPosition: ReturnType<typeof findNodeAtPosition> 
}
*/

export function makeNodes(
  initNodes /*: NodeConstructor[] */ = []
) /*: NodesBundle */ {
  const nodes = makeNodesMap(initNodes);

  return {
    nodes,

    createNode: createNode(nodes),
    getNode_: getNode_(nodes), // can return null
    getNode: getNode(nodes),
    hasNode: hasNode(nodes),
    setNode: setNode(nodes),
    deleteNode: deleteNode(nodes),
    findNodeAtPosition: findNodeAtPosition(nodes),
  };
}
