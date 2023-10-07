export function makeNodesMap(initNodes /*: Node[] */) {
  let maxNodeId = 0;
  return {
    nodes: new Map(
      initNodes.map(({ nodeId, ...node }) => {
        if (maxNodeId < nodeId) maxNodeId = nodeId;
        return [nodeId, node];
      })
    ),
    maxNodeId,
  };
}

export function makeShapesMap(initShapes /*: Shape[] */) {
  let maxShapeId = 0;
  return {
    shapes: new Map(
      initShapes.map(({ shapeId, ...shape }) => {
        if (maxShapeId < shapeId) maxShapeId = shapeId;
        return [shapeId, shape];
      })
    ),
    maxShapeId,
  };
}

export function applyNodeToShapes(
  node /*: Node */,
  shapes /*: Map<number, Shape> */
) {
  for (let { shapeId, attrs } of node.dependents) {
    const shape = shapes.get(shapeId);
    if (shape) {
      for (let fromAttr in attrs) {
        let toAttr = attrs[fromAttr];
        shape[toAttr] = node[fromAttr];
      }
    }
  }
}
