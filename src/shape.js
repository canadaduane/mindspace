// @flow
import { nanoid } from "nanoid";

/*::
import type { Node } from "./node.js";

type ShapeInitial = Shape & { shapeId: string };

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
      selected: boolean;
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
    }
  | {
      type: "tap";
      tapState: TapState;
      x: number;
      y: number;
  };
 
export type ShapeMap = Map<string, Shape>;

export type TapState = "create" | "creating" | "select" | "delete" | "destroying"
*/

export function makeShapesMap(
  initShapes /*: ShapeInitial[] */
) /*: ShapeMap */ {
  return new Map(
    initShapes.map(({ shapeId, ...shape }) => {
      return [shapeId ?? nanoid(12), shape];
    })
  );
}

export function createShape(
  shapes /*: ShapeMap */,
  shape /*: Shape */
) /*: string */ {
  const shapeId = nanoid(12);
  setShape(shapes, shapeId, shape);
  return shapeId;
}

export function getShape(
  shapes /*: ShapeMap */,
  shapeId /*: string */
) /*: Shape */ {
  const shape = shapes.get(shapeId);
  if (!shape) throw new Error(`can't get shape ${shapeId}`);
  return shape;
}

export function setShape(
  shapes /*: ShapeMap */,
  shapeId /*: string */,
  shape /*: Shape */
) {
  shapes.set(shapeId, shape);
}

export function removeShape(
  shapes /*: ShapeMap */,
  shapeId /*: string */
) /*: boolean */ {
  if (shapes.has(shapeId)) {
    shapes.delete(shapeId);
    return true;
  }
  return false;
}

export function setShapeValues(
  shape /*: Shape */,
  values /*: any */
) /*: Shape */ {
  const definedValues = Object.assign({}, values);
  for (var k in definedValues) {
    if (definedValues[k] === undefined) delete definedValues[k];
  }

  Object.assign(shape, definedValues);

  return shape;
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
        // $FlowIgnore
        shape[toAttr] = node[fromAttr];
      }
    }
  }
}
