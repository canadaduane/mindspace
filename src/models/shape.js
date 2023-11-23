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
      color?: string; 
      x: number;
      y: number;
  };
 
export type ShapeMap = Map<string, Shape>;

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
) /*: ShapeMap */ {
  return new Map(
    initShapes.map(({ shapeId, ...shape }) => {
      return [shapeId ?? nanoid(12), shape];
    })
  );
}

export const createShape =
  (shapes /*: ShapeMap */) /*: (shape: Shape) => string */ => (shape) => {
    const shapeId = nanoid(12);
    setShape(shapes)(shapeId, shape);
    return shapeId;
  };

export const getShape =
  (shapes /*: ShapeMap */) /*: (shapeId: string) => Shape */ => (shapeId) => {
    const shape = shapes.get(shapeId);
    if (!shape) throw new Error(`can't get shape ${shapeId}`);
    return shape;
  };

export const setShape =
  (shapes /*: ShapeMap */) /*: (shapeId: string, shape: Shape) => ShapeMap */ =>
  (shapeId, shape) =>
    shapes.set(shapeId, shape);

export const removeShape =
  (shapes /*: ShapeMap */) /*: (shapeId: string) => boolean */ => (shapeId) =>
    shapes.delete(shapeId);

export const setShapeValues =
  (shape /*: Shape */) /*: (values: any) => Shape */ => (values) => {
    const definedValues = Object.assign({}, values);
    for (var k in definedValues) {
      if (definedValues[k] === undefined) delete definedValues[k];
    }

    Object.assign(shape, definedValues);

    return shape;
  };


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
