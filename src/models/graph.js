// @flow
import {
  findNodeAtPosition,
  forEachNode,
  getNode,
  hasNode,
  makeNodesMap,
  removeNode,
  setNode,
  setNodeValues,
} from "./node.js";
import { makeShapesMap } from "./shape.js";

/*::
import { type NodeInitial, type Node } from './node.js'
import { type ShapeInitial, type Shape } from './shape.js'

type GraphInitial = {
  nodes: NodeInitial[],
  shapes: ShapeInitial[]
}

type Graph = {
  getNode: ReturnType<typeof getNode>,
  setNode: ReturnType<typeof setNode>,
  hasNode: ReturnType<typeof hasNode>,
  setNodeValues: typeof setNodeValues,
  removeNode: ReturnType<typeof removeNode>,
  forEachNode: ReturnType<typeof forEachNode>,
  findNodeAtPosition: ReturnType<typeof findNodeAtPosition>,
  nodes: Map<string, Node>,
  shapes: Map<string, Shape>
}
*/

export function makeGraph(
  { nodes: initNodes = [], shapes: initShapes = [] } /*: GraphInitial */
) /*: Graph */ {
  const nodes = makeNodesMap(initNodes);
  const shapes = makeShapesMap(initShapes);
  return {
    getNode: getNode(nodes),
    setNode: setNode(nodes),
    hasNode: hasNode(nodes),
    setNodeValues: setNodeValues,
    removeNode: removeNode(nodes),
    forEachNode: forEachNode(nodes),
    findNodeAtPosition: findNodeAtPosition(nodes),
    nodes,
    shapes,
  };
}
