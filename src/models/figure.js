// @flow
import { nanoid } from "nanoid";
import { orbSize, tapSize } from "../constants.js";
import { Vector2 } from "../math/vector2.js";

/*::
import type { Node } from "./node.js";
import type { Box2 } from "../math/box2.js";
import { orbRectHeight, orbRectWidth } from "../constants";

export type FigureInitial = Figure & { figureId: string };

export type Figure =
  | {
      // A "jot" is a note that can be in the shape of a circle or rectangle 
      type: "jot";
      controlsNodeId: string;
      shape: JotShape;
      color?: string;
      shake?: boolean;
      x?: number;
      y?: number;
    }
  | {
      // A "line" connects two jots 
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
      // A "pop" is a popping animation to indicate a jot-circle is destroyed
      type: "pop";
      color?: string;
      x?: number;
      y?: number;
    }
  | {
      // A "tap" is a transient tap or double tap indicator
      type: "tap";
      tapState: TapState;
      color?: string; 
      x?: number;
      y?: number;
  };

export type JotShape = "circle" | "rectangle";
 
export type FiguresMap = Map<string, Figure>;

export type LineType = "short" | "deleted" | "strong" | "disabled";

export type TapState = 
  | "create"
  | "creating"
  | "color"
  | "select"
  | "delete"
  | "destroying";

*/

export function makeFiguresMap(
  initFigures /*: FigureInitial[] */
) /*: FiguresMap */ {
  return new Map(
    initFigures.map(({ figureId, ...figure }) => {
      return [figureId ?? nanoid(12), figure];
    })
  );
}

export const createFigure =
  (
    figures /*: FiguresMap */
  ) /*: (figure: Figure) => { figureId: string, figure: Figure } */ =>
  (figure /*: Figure */) => {
    const figureId = nanoid(12);
    setFigure(figures)(figureId, figure);
    return { figureId, figure };
  };

export const getFigure =
  (figures /*: FiguresMap */) /*: (figureId: string) => Figure */ =>
  (figureId) => {
    const figure = figures.get(figureId);
    if (!figure) throw new Error(`can't get figure ${figureId}`);
    return figure;
  };

export const hasFigure =
  (figures /*: FiguresMap */) /*: (figureId: string) => boolean */ =>
  (figureId) =>
    figures.has(figureId);

export const setFigure =
  (
    figures /*: FiguresMap */
  ) /*: (figureId: string, figure: Figure) => FiguresMap */ =>
  (figureId, figure) =>
    figures.set(figureId, figure);

export const removeFigure =
  (figures /*: FiguresMap */) /*: (figureId: string) => boolean */ =>
  (figureId) =>
    figures.delete(figureId);

export const setLineType =
  (
    figures /*: FiguresMap */
  ) /*: (figureId: string, lineType: LineType) => Figure */ =>
  (figureId, lineType) => {
    const figure = figures.get(figureId);
    if (!figure) throw new Error(`can't get Line figure: ${figureId}`);
    if (figure.type !== "line")
      throw new Error(`figure not a line: ${figureId} (${figure.type})`);
    return setFigureValues(figure, { lineType });
  };

/* Utility Functions */

export function setFigureValues(
  figure /*: Figure */,
  values /*: any */
) /*: Figure */ {
  const definedValues = Object.assign({}, values);
  for (var k in definedValues) {
    if (definedValues[k] === undefined) delete definedValues[k];
  }

  Object.assign(figure, definedValues);

  return figure;
}

const p = new Vector2();

function setCircleBoundingBox(
  target /*: Box2 */,
  x /*: number | void */,
  y /*: number | void */,
  r /*: number */
) {
  const x_ = x ?? 0;
  const y_ = y ?? 0;

  target.min.set(x_ - r, y_ - r);
  target.max.set(x_ + r, y_ + r);
}

export function setFigureBoundingBox(figure /*: Figure */, target /*: Box2 */) {
  switch (figure.type) {
    case "pop":
      setCircleBoundingBox(target, figure.x, figure.y, orbSize / 2);
      return;

    case "jot":
      if (figure.shape === "circle") {
        setCircleBoundingBox(target, figure.x, figure.y, orbSize / 2);
      } else {
        const x = figure.x ?? 0;
        const y = figure.y ?? 0;
        const wHalf = orbRectWidth / 2;
        const hHalf = orbRectHeight / 2;
        target.min.set(x - wHalf, y - hHalf);
        target.max.set(x + wHalf, y + hHalf);
      }
      return;

    case "line":
      p.set(figure.x1 ?? 0, figure.y1 ?? 0);
      target.expandByPoint(p);

      p.set(figure.x2 ?? 0, figure.y2 ?? 0);
      target.expandByPoint(p);

      return;

    case "tap":
      setCircleBoundingBox(target, figure.x, figure.y, tapSize / 2);
      return;
  }
}

/*::
export type FiguresBundle = {
  figures: FiguresMap,

  createFigure: ReturnType<typeof createFigure>,
  getFigure: ReturnType<typeof getFigure>,
  hasFigure: ReturnType<typeof hasFigure>,
  setFigure: ReturnType<typeof setFigure>,
  removeFigure: ReturnType<typeof removeFigure>,
  setLineType: ReturnType<typeof setLineType>,
}
*/

export function makeFigures(
  initFigures /*: FigureInitial[] */ = []
) /*: FiguresBundle */ {
  const figures = makeFiguresMap(initFigures);

  return {
    figures,
    createFigure: createFigure(figures),
    getFigure: getFigure(figures),
    hasFigure: hasFigure(figures),
    setFigure: setFigure(figures),
    removeFigure: removeFigure(figures),
    setLineType: setLineType(figures),
  };
}
