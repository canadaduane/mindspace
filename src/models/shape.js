// @flow
import { nanoid } from "nanoid";
import { orbSize, tapSize } from "../constants";

/*::
import type { Node } from "./node.js";
import type { Box2 } from "../math/box2";
import { Vector2 } from "../math/vector2";

export type ShapeInitial = Shape & { shapeId: string };

export type Shape =
  | {
      type: "circle";
      controlsNodeId: string;
      color?: string;
      shake?: boolean;
      x?: number;
      y?: number;
    }
  | {
      type: "line";
      lineType: LineType;
      connectedNodeId1: string;
      connectedNodeId2: string;
      selected?: boolean;
      color?: string;
      x1?: number;
      y1?: number;
      x2?: number;
      y2?: number;
    }
  | {
      type: "pop";
      color?: string;
      x?: number;
      y?: number;
    }
  | {
      type: "tap";
      tapState: TapState;
      color?: string; 
      x?: number;
      y?: number;
  };
 
export type ShapesMap = Map<string, Shape>;

export type LineType = "short" | "deleted" | "strong" | "disabled";

export type TapState = 
  | "create"
  | "creating"
  | "color"
  | "select"
  | "delete"
  | "destroying";

*/

export function makeShapesMap(
  initShapes /*: ShapeInitial[] */
) /*: ShapesMap */ {
  return new Map(
    initShapes.map(({ shapeId, ...shape }) => {
      return [shapeId ?? nanoid(12), shape];
    })
  );
}

export const createShape =
  (
    shapes /*: ShapesMap */
  ) /*: (shape: Shape) => { shapeId: string, shape: Shape } */ =>
  (shape /*: Shape */) => {
    const shapeId = nanoid(12);
    setShape(shapes)(shapeId, shape);
    return { shapeId, shape };
  };

export const getShape =
  (shapes /*: ShapesMap */) /*: (shapeId: string) => Shape */ => (shapeId) => {
    const shape = shapes.get(shapeId);
    if (!shape) throw new Error(`can't get shape ${shapeId}`);
    return shape;
  };

export const hasShape =
  (shapes /*: ShapesMap */) /*: (shapeId: string) => boolean */ => (shapeId) =>
    shapes.has(shapeId);

export const setShape =
  (
    shapes /*: ShapesMap */
  ) /*: (shapeId: string, shape: Shape) => ShapesMap */ =>
  (shapeId, shape) =>
    shapes.set(shapeId, shape);

export const removeShape =
  (shapes /*: ShapesMap */) /*: (shapeId: string) => boolean */ => (shapeId) =>
    shapes.delete(shapeId);

export const setLineType =
  (
    shapes /*: ShapesMap */
  ) /*: (shapeId: string, lineType: LineType) => Shape */ =>
  (shapeId, lineType) => {
    const shape = shapes.get(shapeId);
    if (!shape) throw new Error(`can't get Line shape: ${shapeId}`);
    if (shape.type !== "line")
      throw new Error(`shape not a line: ${shapeId} (${shape.type})`);
    return setShapeValues(shape, { lineType });
  };

/* Utility Functions */

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

const p = new Vector2();

export function getShapeBoundingBox(shape /*: Shape */, target /*: Box2 */) {
  switch (shape.type) {
    case "pop":
    case "circle": {
      const x = shape.x ?? 0;
      const y = shape.y ?? 0;
      const r = orbSize / 2;

      target.min.set(x - r, y - r);
      target.max.set(x + r, y + r);

      return;
    }

    case "line": {
      p.set(shape.x1 ?? 0, shape.y1 ?? 0);
      target.expandByPoint(p);

      p.set(shape.x2 ?? 0, shape.y2 ?? 0);
      target.expandByPoint(p);

      return;
    }

    case "tap": {
      const x = shape.x ?? 0;
      const y = shape.y ?? 0;
      const r = tapSize / 2;

      target.min.set(x - r, y - r);
      target.max.set(x + r, y + r);

      return;
    }
  }
}

/*::
export type ShapesBundle = {
  shapes: ShapesMap,

  createShape: ReturnType<typeof createShape>,
  getShape: ReturnType<typeof getShape>,
  hasShape: ReturnType<typeof hasShape>,
  setShape: ReturnType<typeof setShape>,
  removeShape: ReturnType<typeof removeShape>,
  setLineType: ReturnType<typeof setLineType>,
}
*/

export function makeShapes(
  initShapes /*: ShapeInitial[] */ = []
) /*: ShapesBundle */ {
  const shapes = makeShapesMap(initShapes);

  return {
    shapes,
    createShape: createShape(shapes),
    getShape: getShape(shapes),
    hasShape: hasShape(shapes),
    setShape: setShape(shapes),
    removeShape: removeShape(shapes),
    setLineType: setLineType(shapes),
  };
}
