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

export function getNode(nodeId /*: number */, nodes /*: Map<number, Node> */) {
  const node = nodes.get(nodeId);
  if (!node) throw new Error(`can't get node ${nodeId}`);
  return node;
}

export function hasNode(nodeId /*: number */, nodes /*: Map<number, Node> */) {
  return nodes.has(nodeId);
}
