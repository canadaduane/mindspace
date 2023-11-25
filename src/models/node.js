// @flow
import { nanoid } from "nanoid";
import { orbSize } from "../constants.js";
import { Box2 } from "../math/box2.js";

/*::
import { Vector2 } from "../math/vector2.js";

export type ConstructorNode = {
  nodeId?: string,
  ...Pick<Node, 'x' | 'y'>,
  ...Partial<Omit<Node, 'x' | 'y'>>
}

export type Node = {
  x: number; // The global X coordinate for this node
  y: number; // The global Y coordinate for this node
  bbox: Box2; // Cached bounding box for this node, including all figure dependents
  color: string; // The color chosen for this node
  spiral: number; // A number that stores the "spiral step" for new nodes
  dependents: Map<string, DependentFigureAttrs>; // A map of dependent figures' attributes
};

export type DependentFigureAttrs = Record<string, string>;

export type NodesMap = Map<string, Node>;
*/

export function constructNode(node /*: ConstructorNode */) /*: Node */ {
  return {
    x: node.x,
    y: node.y,
    bbox: node.bbox ?? new Box2(),
    color: node.color ?? "white",
    spiral: node.spiral ?? 0,
    dependents: node.dependents ?? new Map(),
  };
}

export function makeNodeId(defaultNodeId /*: string | void */) /*: string */ {
  return defaultNodeId ?? nanoid(12);
}

export function makeNodesMap(
  nodes /*: ConstructorNode[] */
) /*: Map<string, Node> */ {
  return new Map(
    nodes.map(({ nodeId, ...node }) => [
      makeNodeId(nodeId),
      constructNode(node),
    ])
  );
}

export const createNode =
  (
    nodes /*: NodesMap */
  ) /*: (initNode: ConstructorNode) => { nodeId: string, node: Node } */ =>
  ({ nodeId, ...initNode } /*: ConstructorNode */) => {
    const newNodeId = makeNodeId(nodeId);
    const newNode = constructNode(initNode);
    setNode(nodes)(newNodeId, newNode);
    return { nodeId: newNodeId, node: newNode };
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
  (nodes /*: NodesMap */) /*: (nodeId: string) => boolean */ => (nodeId) =>
    nodes.delete(nodeId);

export function setNodeValues(node /*: Node */, values /*: any */) /*: Node */ {
  Object.assign(node, values);
  if ("x" in values || "y" in values) {
  }
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
  initNodes /*: ConstructorNode[] */ = []
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
