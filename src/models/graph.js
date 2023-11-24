// @flow
import { makeNodes } from "./node.js";
import { makeShapes } from "./shape.js";

/*::
import { type NodeInitial, type Node, type NodesBundle } from './node.js'
import { type ShapeInitial, type Shape, type ShapesBundle } from './shape.js'
import type { Vector2 } from "../math/vector2";
import type { DependentShapeAttrs } from "./node";

type GraphInitial = {
  nodes: NodeInitial[],
  shapes: ShapeInitial[]
};

type Graph = {
  ...NodesBundle, 
  ...ShapesBundle,

  applyNodesToShapes: () => void,
  createCircleControllingNode: CreateCircleControllingNodeFn,
  removeNodeWithDependents: RemoveNodeWithDependentsFn,
  
  nodes: Map<string, Node>,
};

type CreateCircleControllingNodeFn = ( pos: Vector2, color: string ) =>
  { nodeId: string, node: Node, shapeId: string, shape: Shape };

type RemoveNodeWithDependentsFn = ( nodeId: string ) => boolean;
 
*/

export function makeGraph(
  { nodes: initNodes = [], shapes: initShapes = [] } /*: GraphInitial */
) /*: Graph */ {
  const nodes = makeNodes(initNodes);
  const shapes = makeShapes(initShapes);

  return {
    ...nodes,
    ...shapes,

    applyNodesToShapes: () => {
      nodes.nodes.forEach((node) => {
        applyNodeToShapes(node, shapes.shapes);
      });
    },

    createCircleControllingNode: createCircleControllingNode(nodes, shapes),
    removeNodeWithDependents: removeNodeWithDependents(nodes, shapes),
  };
}

export const getShapesConnectedToLineShapeId =
  (graph /*: Graph */) /*: (shapeId: string) => Shape[] */ => (shapeId) => {
    const connectedShapes /*: Shape[] */ = [];
    graph.nodes.forEach((node) => {
      const hasDeps = node.dependents.has(shapeId);

      if (!hasDeps) return;

      node.dependents.forEach((attrs, depShapeId) => {
        if (depShapeId === shapeId) return;

        const shape = graph.getShape(depShapeId);
        if (shape && shape.type === "circle") {
          connectedShapes.push(shape);
        }
      });
    });
    return connectedShapes;
  };

export function applyNodeToShapes(
  node /*: Node */,
  shapes /*: Map<string, Shape> */
) {
  node.dependents.forEach((attrs, shapeId) => {
    const shape = shapes.get(shapeId);
    if (!shape) return;

    for (let fromAttr in attrs) {
      let toAttr = attrs[fromAttr];
      // $FlowIgnore
      shape[toAttr] = node[fromAttr];
    }
  });
}

const createCircleControllingNode =
  (
    nodes /*: NodesBundle */,
    shapes /*: ShapesBundle */
  ) /*: CreateCircleControllingNodeFn */ =>
  (pos, color) => {
    const { nodeId, node } = nodes.createNode({
      x: pos.x,
      y: pos.y,
      color,
      text: null,
      dependents: new Map(),
      spiral: 0,
    });

    // Create a circle that controls the node
    const { shapeId, shape } = shapes.createShape({
      type: "circle",
      color,
      shake: false,
      x: pos.x,
      y: pos.y,
      controlsNodeId: nodeId,
    });

    // Create lines from this node to all other nodes
    nodes.nodes.forEach((otherNode, otherNodeId) => {
      if (nodeId === otherNodeId) return;
      createConnectedLine(shapes, node.dependents, otherNode.dependents);
    });

    // Create the new node that all shapes depend on for position updates
    node.dependents.set(shapeId, {
      x: "x",
      y: "y",
      color: "color",
    });

    return { nodeId, node, shapeId, shape };
  };

const createConnectedLine = (
  shapes /*: ShapesBundle */,
  nodeDependents1 /*: Map<string, DependentShapeAttrs> */,
  nodeDependents2 /*: Map<string, DependentShapeAttrs> */
) => {
  const { shape, shapeId } = shapes.createShape({
    type: "line",
    lineType: "short",
  });

  nodeDependents1.set(shapeId, { x: "x2", y: "y2" });
  nodeDependents2.set(shapeId, { x: "x1", y: "y1" });

  return { shape, shapeId };
};

// Remove node and its dependents
const removeNodeWithDependents =
  (
    nodes /*: NodesBundle */,
    shapes /*: ShapesBundle */
  ) /*: RemoveNodeWithDependentsFn */ =>
  (nodeId) => {
    const node = nodes.getNode(nodeId);
    node.dependents.forEach((_attrs, depShapeId) => {
      shapes.removeShape(depShapeId);
    });
    return nodes.removeNode(nodeId);
  };
