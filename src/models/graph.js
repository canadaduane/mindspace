// @flow
import {
  makeNodesMap,
  getNode,
  setNode,
  hasNode,
  removeNode,
  findNodeAtPosition,
  forEachNode,
  setNodeValues,
} from "./node.js";
import { makeShapes } from "./shape.js";

/*::
import { type NodeInitial, type Node } from './node.js'
import { type ShapeInitial, type Shape, type ShapesBundle } from './shape.js'

type GraphInitial = {
  nodes: NodeInitial[],
  shapes: ShapeInitial[]
}

type Graph = {
  ...ShapesBundle,

  getNode: ReturnType<typeof getNode>,
  setNode: ReturnType<typeof setNode>,
  hasNode: ReturnType<typeof hasNode>,
  setNodeValues: typeof setNodeValues,
  removeNode: ReturnType<typeof removeNode>,
  forEachNode: ReturnType<typeof forEachNode>,
  findNodeAtPosition: ReturnType<typeof findNodeAtPosition>,

  applyNodesToShapes: () => void,
  
  nodes: Map<string, Node>,
}
*/

export function makeGraph(
  { nodes: initNodes = [], shapes: initShapes = [] } /*: GraphInitial */
) /*: Graph */ {
  const nodes = makeNodesMap(initNodes);
  const shapes = makeShapes(initShapes);

  const applyNodesToShapes = () => {
    forEachNode(nodes)((node) => {
      applyNodeToShapes(node, shapes.shapes);
    });
  };

  return {
    getNode: getNode(nodes),
    setNode: setNode(nodes),
    hasNode: hasNode(nodes),
    setNodeValues: setNodeValues,
    removeNode: removeNode(nodes),
    forEachNode: forEachNode(nodes),
    findNodeAtPosition: findNodeAtPosition(nodes),

    ...shapes, 

    applyNodesToShapes,

    nodes,
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
