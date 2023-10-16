import { nanoid } from "nanoid";

/*+
type InitialShape = Shape & { shapeId: string };

type Shape =
  | {
      type: "circle";
      controlsNodeId: number;
      color: string;
      shake: boolean;
      cx: number;
      cy: number;
    }
  | {
      type: "cone";
      controlsNodeId: number;
      forceCutMode: boolean;
      color: string;
      cx: number;
      cy: number;
    }
  | {
      type: "line";
      color: string;
      lineType: "short" | "deleted" | "strong" | "disabled";
      x1: number;
      y1: number;
      x2: number;
      y2: number;
    }
  | {
      type: "pop";
      color: string;
      x: number;
      y: number;
    };
*/

export function makeShapesMap(initShapes /*: InitialShape[] */) {
  return new Map(
    initShapes.map(({ shapeId, ...shape }) => {
      return [shapeId ?? nanoid(12), shape];
    })
  );
}

export function applyNodeToShapes(
  node /*: Node */,
  shapes /*: Map<string, Shape> */
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
