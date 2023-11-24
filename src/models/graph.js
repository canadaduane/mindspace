// @flow
import { makeNodes } from "./node.js";
import { makeShapes } from "./shape.js";

/*::
import { type NodeInitial, type Node, type NodesBundle } from './node.js'
import { type ShapeInitial, type Shape, type ShapesBundle } from './shape.js'
import type { Vector2 } from "../math/vector2";
import type { Dependent } from "./node";

type GraphInitial = {
  nodes: NodeInitial[],
  shapes: ShapeInitial[]
}

type Graph = {
  ...NodesBundle, 
  ...ShapesBundle,

  applyNodesToShapes: () => void,
  createCircleControllingNode: CreateCircleControllingNode,
  
  nodes: Map<string, Node>,
}

type CreateCircleControllingNode =
  (
    pos: Vector2,
    color: string,
  ) => { nodeId: string, node: Node, shapeId: string, shape: Shape }
 
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
  };
}

export const getShapesConnectedToLineShapeId =
  (graph /*: Graph */) /*: (shapeId: string) => Shape[] */ => (shapeId) => {
    const connectedShapes /*: Shape[] */ = [];
    graph.nodes.forEach((node) => {
      const hasDeps =
        node.dependents.filter((dep) => dep.shapeId === shapeId).length > 0;

      if (!hasDeps) return;

      for (let dep of node.dependents) {
        if (dep.shapeId !== shapeId) {
          const shape = graph.getShape(dep.shapeId);
          if (shape && shape.type === "circle") {
            connectedShapes.push(shape);
          }
        }
      }
    });
    return connectedShapes;
  };

export function applyNodeToShapes(
  node /*: Node */,
  shapes /*: Map<string, Shape> */
) {
  for (let { shapeId, attrs } of node.dependents) {
    const shape = shapes.get(shapeId);
    if (shape) {
      for (let fromAttr in attrs) {
        let toAttr = attrs[fromAttr];
        // $FlowIgnore
        shape[toAttr] = node[fromAttr];
      }
    }
  }
}

const createCircleControllingNode =
  (
    nodes /*: NodesBundle */,
    shapes /*: ShapesBundle */
  ) /*: CreateCircleControllingNode */ =>
  (pos, color) => {
    const { nodeId, node } = nodes.createNode({
      x: pos.x,
      y: pos.y,
      color,
      text: null,
      dependents: [],
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
    nodes.nodes.forEach((otherNode) => {
      createConnectedLine(shapes, node.dependents, otherNode.dependents);
    });

    // Create the new node that all shapes depend on for position updates
    node.dependents.push({
      shapeId,
      attrs: {
        x: "x",
        y: "y",
        color: "color",
      },
    });

    return { nodeId, node, shapeId, shape };
  };

const createConnectedLine = (
  shapes /*: ShapesBundle */,
  nodeDependents1 /*: Dependent[] */,
  nodeDependents2 /*: Dependent[] */
) => {
  const { shape, shapeId } = shapes.createShape({
    type: "line",
    lineType: "short",
  });

  nodeDependents1.push({ shapeId, attrs: { x: "x2", y: "y2" } });
  nodeDependents2.push({ shapeId, attrs: { x: "x1", y: "y1" } });

  return { shape, shapeId };
};
