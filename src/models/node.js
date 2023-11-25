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

function createNode(
  nodes /*: NodesMap */,
  { nodeId, ...initNode } /*: NodeConstructor */
) /*: { nodeId: string, node: Node } */ {
  const newNodeId = makeId(nodeId);
  const newNode = constructNode(initNode);
  setNode(nodes, newNodeId, newNode);
  return { nodeId: newNodeId, node: newNode };
}

function getNode_(nodes /*: NodesMap */, nodeId /*: string */) /*: ?Node */ {
  return nodes.get(nodeId);
}

function getNode(nodes /*: NodesMap */, nodeId /*: string */) /*: Node */ {
  return nonNull(nodes.get(nodeId), "null nodeId");
}

function setNode(
  nodes /*: NodesMap */,
  nodeId /*: string */,
  node /*: Node */
) /*: NodesMap */ {
  return nodes.set(nodeId, node);
}

function hasNode(nodes /*: NodesMap */, nodeId /*: string */) /*: boolean */ {
  return nodes.has(nodeId);
}

function deleteNode(
  nodes /*: NodesMap */,
  nodeId /*: string */
) /*: boolean */ {
  return nodes.delete(nodeId);
}

function updateNode(
  nodes /*: NodesMap */,
  nodeId /*: string */,
  attrs /*: Partial<Node> */
) /*: Node */ {
  const node = getNode(nodes, nodeId);
  const updated = { ...node, ...attrs };
  nodes.set(nodeId, updated);
  return updated;
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

  createNode: (node: NodeConstructor) => { nodeId: string, node: Node },
  getNode_: (nodeId: string) => ?Node,
  getNode: (nodeId: string) => Node,
  hasNode: (nodeId: string) => boolean,
  setNode:(nodeId: string, node: Node) => NodesMap, 
  updateNode:(nodeId: string, node: Partial<Node>) => Node, 
  deleteNode: (nodeId: string) => boolean,
  findNodeAtPosition: ReturnType<typeof findNodeAtPosition> 
}
*/

export function makeNodes(
  initNodes /*: NodeConstructor[] */ = []
) /*: NodesBundle */ {
  const nodes = makeNodesMap(initNodes);

  return {
    nodes,

    createNode: (node) => createNode(nodes, node),
    getNode_: (nodeId) => getNode_(nodes, nodeId),
    getNode: (nodeId) => getNode(nodes, nodeId),
    hasNode: (nodeId) => hasNode(nodes, nodeId),
    setNode: (nodeId, node) => setNode(nodes, nodeId, node),
    updateNode: (nodeId, attrs) => updateNode(nodes, nodeId, attrs),
    deleteNode: (nodeId) => deleteNode(nodes, nodeId),
    findNodeAtPosition: findNodeAtPosition(nodes),
  };
}
