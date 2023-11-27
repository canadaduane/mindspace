// @flow
import { makeNodes } from "./node.js";
import {
  makeFigures,
  updateFigureBoundingBox,
  getCollisionShapes,
} from "./figure.js";
import { Vector2 } from "../math/vector2.js";
import { Box2 } from "../math/box2.js";
import {
  jotCircleRadius,
  jotRectangleWidth,
  jotRectangleHeight,
} from "../constants.js";

/*::
import { type NodeConstructor, type Node, type NodesBundle } from './node.js'
import { type FigureConstructor, type Figure, type FiguresBundle } from './figure.js'
import type { DependentFigureAttrs } from "./node.js";
import type { FiguresMap, CollisionShape } from "./figure.js";

type GraphInitial = {
  nodes: NodeConstructor[];
  figures: FigureConstructor[];
};

export type Graph = {
  ...NodesBundle;
  ...FiguresBundle;

  applyNodesToFigures: () => void;
  createJotWithNode: CreateJotWithNodeFn;
  deleteNodeWithDependents: RemoveNodeWithDependentsFn;
  getFiguresConnectedToLineFigureId: GetFiguresConnectedFn;
  findJotsAtPosition: (pos: Vector2) => string[]; 

  debug: () => void;
};

type CreateJotWithNodeFn = ( pos: Vector2, color: string ) =>
  { nodeId: string; node: Node; figureId: string; figure: Figure };

type RemoveNodeWithDependentsFn = ( nodeId: string ) => boolean;
 
type GetFiguresConnectedFn = (figureId: string) => Figure[];

*/

export function makeGraph(
  { nodes: initNodes = [], figures: initFigures = [] } /*: GraphInitial */
) /*: Graph */ {
  const nodes = makeNodes(initNodes);
  const figures = makeFigures(initFigures);

  return {
    ...nodes,
    ...figures,

    applyNodesToFigures: () => {
      nodes.nodes.forEach((node) => {
        applyNodeToFigures(node, figures.figures);
      });
    },

    createJotWithNode: createJotWithNode(nodes, figures),
    deleteNodeWithDependents: deleteNodeWithDependents(nodes, figures),
    getFiguresConnectedToLineFigureId: getFiguresConnectedToLineFigureId(
      nodes,
      figures
    ),
    findJotsAtPosition: (pos) => findJotsAtPosition(figures.figures, pos),

    debug: () => {
      console.log("nodes", nodes.nodes);
      console.log("figures", figures.figures);
    },
  };
}

export const getFiguresConnectedToLineFigureId =
  (
    nodes /*: NodesBundle */,
    figures /*: FiguresBundle */
  ) /*: GetFiguresConnectedFn */ =>
  (figureId) => {
    const connectedFigures /*: Figure[] */ = [];
    nodes.nodes.forEach((node) => {
      const hasDeps = node.dependents.has(figureId);

      if (!hasDeps) return;

      node.dependents.forEach((attrs, depFigureId) => {
        if (depFigureId === figureId) return;

        const figure = figures.getFigure(depFigureId);
        if (figure.type === "jot") {
          connectedFigures.push(figure);
        }
      });
    });

    return connectedFigures;
  };

export function applyNodeToFigures(
  node /*: Node */,
  figures /*: Map<string, Figure> */
) {
  node.dependents.forEach((attrs, figureId) => {
    const figure = figures.get(figureId);
    if (!figure) return;

    for (let fromAttr in attrs) {
      let toAttr = attrs[fromAttr];
      // $FlowIgnore
      figure[toAttr] = node[fromAttr];
    }

    updateFigureBoundingBox(figure);
  });
}

const createJotWithNode =
  (
    nodes /*: NodesBundle */,
    figures /*: FiguresBundle */
  ) /*: CreateJotWithNodeFn */ =>
  (pos, color) => {
    const { nodeId, node } = nodes.createNode({
      x: pos.x,
      y: pos.y,
      color,
      dependents: new Map(),
      spiral: 0,
    });

    // Create a jot that controls the node
    const { figureId, figure } = figures.createFigure({
      type: "jot",
      color,
      x: pos.x,
      y: pos.y,
      controlsNodeId: nodeId,
    });

    // Create lines from this node to all other nodes
    nodes.nodes.forEach((otherNode, otherNodeId) => {
      if (nodeId === otherNodeId) return;
      createConnectedLine(figures, nodeId, node, otherNodeId, otherNode);
    });

    // Create the new node that all figures depend on for position updates
    node.dependents.set(figureId, {
      x: "x",
      y: "y",
      color: "color",
    });

    return { nodeId, node, figureId, figure };
  };

const createConnectedLine = (
  figures /*: FiguresBundle */,
  nodeId1 /*: string */,
  node1 /*: Node */,
  nodeId2 /*: string*/,
  node2 /*: Node */
) => {
  const { figure, figureId } = figures.createFigure({
    type: "line",
    lineType: "short",
    connectedNodeId1: nodeId1,
    connectedNodeId2: nodeId2,
  });

  node1.dependents.set(figureId, { x: "x2", y: "y2" });
  node2.dependents.set(figureId, { x: "x1", y: "y1" });

  return { figure, figureId };
};

// Remove node and its dependents
const deleteNodeWithDependents = (
  nodes /*: NodesBundle */,
  figures /*: FiguresBundle */
) /*: RemoveNodeWithDependentsFn */ =>
  function remove(nodeId /*: string */) /*: boolean */ {
    const node = nodes.getNode(nodeId);
    node.dependents.forEach((_attrs, depFigureId) => {
      if (!figures.hasFigure(depFigureId)) return;
      const depFigure = figures.getFigure(depFigureId);
      figures.deleteFigure(depFigureId);
      if (depFigure.type === "line") {
        if (nodes.hasNode(depFigure.connectedNodeId1)) {
          const connectedNode = nodes.getNode(depFigure.connectedNodeId1);
          connectedNode.dependents.delete(depFigureId);
        }
        if (nodes.hasNode(depFigure.connectedNodeId2)) {
          const connectedNode = nodes.getNode(depFigure.connectedNodeId2);
          connectedNode.dependents.delete(depFigureId);
        }
      }
    });
    return nodes.deleteNode(nodeId);
  };

function findJotsAtPosition(
  figures /*: FiguresMap */,
  pos /*: Vector2 */
) /*: string[] */ {
  const matches /*: string[] */ = [];
  figures.forEach((figure, figureId) => {
    if (figure.type !== "jot") return;

    const isInside = getCollisionShapes(figure).reduce(
      (soFar /*: boolean */, shape /*: CollisionShape */) => {
        if (soFar) return soFar;
        switch (shape.type) {
          case "circle":
            return soFar || shape.center.distanceTo(pos) <= shape.radius;
          case "rectangle":
            return soFar || shape.box.containsPoint(pos);
          default:
            throw new Error(`unhandled collision shape type: ${shape.type}`);
        }
      },
      false
    );

    if (isInside) {
      matches.push(figureId);
    }
  });
  return matches;
}
