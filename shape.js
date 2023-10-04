export function shapeSortOrder(shape) {
  if (shape.type === "line") return 0;
  if (shape.type === "circle") return 1;
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
