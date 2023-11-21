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
  attrs: Record<string, string>; // A mapping from Node attributes to Shape attributes
};

export type NodeMap = Map<string, Node>;
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

export const getNode =
  (nodes /*: NodeMap */) /*: (nodeId: string) => Node */ => (nodeId) => {
    const node = nodes.get(nodeId);
    if (!node) throw new Error(`can't get node ${nodeId}`);
    return node;
  };

export const setNode =
  (
    nodes /*: NodeMap */
  ) /*: (nodeId: string, node: Node) => Map<string, Node> */ =>
  (nodeId, node) =>
    nodes.set(nodeId, node);

export const removeNode =
  (nodes /*: NodeMap */) /*: (nodeId: string) => boolean */ => (nodeId) => {
    if (nodes.has(nodeId)) {
      return nodes.delete(nodeId);
    }
    return false;
  };

export const forEachNode =
  (nodes /*: NodeMap */) /*: (action: (node: Node) => void) => void */ =>
  (action) => {
    for (let node of nodes.values()) {
      action(node);
    }
  };

export const hasNode =
  (nodes /*: NodeMap */) /*: (nodeId: string) => boolean */ => (nodeId) =>
    nodes.has(nodeId);

export const setNodeValues = (node /*: Node */, values /*: any */) => {
  Object.assign(node, values);
};

export const findNodeAtPosition =
  (nodes /*: NodeMap */) /*: (pos: Vector2) => Node | void */ => (pos) => {
    for (let [nodeId, node] of nodes.entries()) {
      // $FlowIgnore
      if (pos.distanceTo(node) <= orbSize / 2) {
        return node;
      }
    }
  };
