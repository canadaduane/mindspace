// @flow
import { makeNodes } from "./node.js";
import { makeShapes } from "./shape.js";

/*::
import { type NodeInitial, type Node, type NodesBundle } from './node.js'
import { type ShapeInitial, type Shape, type ShapesBundle } from './shape.js'

type GraphInitial = {
  nodes: NodeInitial[],
  shapes: ShapeInitial[]
}

type Graph = {
  ...NodesBundle, 
  ...ShapesBundle,

  applyNodesToShapes: () => void,
  
  nodes: Map<string, Node>,
}
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
