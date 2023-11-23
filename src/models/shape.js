// @flow
import { nanoid } from "nanoid";

/*::
import type { Node } from "./node.js";

export type ShapeInitial = Shape & { shapeId: string };

export type Shape =
  | {
      type: "circle";
      controlsNodeId: number;
      color: string;
      shake: boolean;
      x: number;
      y: number;
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
      color?: string; 
      x: number;
      y: number;
  };
 
export type ShapesMap = Map<string, Shape>;

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
  (shapes /*: ShapesMap */) /*: (shape: Shape) => string */ =>
  (shape /*: Shape */) => {
    const shapeId = nanoid(12);
    setShape(shapes)(shapeId, shape);
    return shapeId;
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

// const getDependentShapesOfControllerShape = (shapeId /*: string */) => {
//   const shape = shapes.get(shapeId);
//   if (shape) {
//     const node = getNode(nodes, shape.controlsNodeId);
//     const shapeIds = [];
//     if (node) {
//       for (let dep of node.dependents) {
//         const depShape = shapes.get(dep.shapeId);
//         if (depShape) {
//           shapeIds.push(depShape);
//         }
//       }
//     }
//     return shapeIds;
//   } else {
//     throw new Error(`can't find shape: ${shapeId}`);
//   }
// };

/*::
export type ShapesBundle = {
  shapes: ShapesMap,

  createShape: ReturnType<typeof createShape>,
  getShape: ReturnType<typeof getShape>,
  hasShape: ReturnType<typeof hasShape>,
  setShape: ReturnType<typeof setShape>,
  removeShape: ReturnType<typeof removeShape>
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
  };
}
