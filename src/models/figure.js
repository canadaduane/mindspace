// @flow
import { nanoid } from "nanoid";
import { orbSize, tapSize } from "../constants.js";
import { Vector2 } from "../math/vector2.js";
import { nonNull, makeId } from "../utils.js";

/*::
import type { Box2 } from "../math/box2.js";
import { orbRectHeight, orbRectWidth } from "../constants";

// A "jot" is a note that can be in the shape of a circle or rectangle 
export type JotShape = "circle" | "rectangle";
export type JotFigure = {
  type: "jot";
  controlsNodeId: string;
  shape: JotShape;
  text: string;
  color: string;
  shake: boolean;
  x: number;
  y: number;
}
export type JotFigureConstructor = {
  type: "jot";
  figureId?: string;
  ...Pick<JotFigure, "controlsNodeId">;
  ...Partial<Omit<JotFigure, "controlsNodeId">>;
}

// A "line" connects two jots 
export type LineType = "short" | "deleted" | "strong" | "disabled";
export type LineFigure = {
  type: "line";
  lineType: LineType;
  connectedNodeId1: string;
  connectedNodeId2: string;
  selected: boolean;
  color: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}
export type LineFigureConstructor = {
  type: "line";
  figureId?: string;
  ...Pick<LineFigure, "lineType" | "connectedNodeId1" | "connectedNodeId2">;
  ...Partial<Omit<LineFigure, "lineType" | "connectedNodeId1" | "connectedNodeId2">>;
}

// A "pop" is a popping animation to indicate a jot-circle is destroyed
export type PopFigure = {
  type: "pop";
  color: string;
  x: number;
  y: number;
};
export type PopFigureConstructor = {
  type: "pop";
  figureId?: string;
  ...Partial<PopFigure>;
}

// A "tap" is a transient tap or double tap indicator
export type TapState = 
  "create" | "creating" | "color" | "select" | "delete" | "destroying";
export type TapFigure = {
  type: "tap";
  tapState: TapState;
  color: string; 
  x: number;
  y: number;
};
export type TapFigureConstructor = {
  type: "tap";
  figureId?: string;
  ...Pick<TapFigure, "tapState">;
  ...Partial<Omit<TapFigure, "tapState">>;
}

export type Figure =
  | JotFigure
  | LineFigure 
  | PopFigure 
  | TapFigure;

export type FigureConstructor =
  | JotFigureConstructor
  | LineFigureConstructor 
  | PopFigureConstructor 
  | TapFigureConstructor;
 
export type FiguresMap = Map<string, Figure>;
*/

export const constructJotFigure = (
  { figureId, ...params } /*: JotFigureConstructor */
) /*: JotFigure */ => ({
  ...{
    // Default values
    shape: "circle",
    text: "",
    color: "white",
    shake: false,
    x: 0,
    y: 0,
  },
  ...params,
});

export const constructLineFigure = (
  { figureId, ...params } /*: LineFigureConstructor */
) /*: LineFigure */ => ({
  ...{
    // Default values
    selected: false,
    color: "white",
    x1: 0,
    y1: 0,
    x2: 0,
    y2: 0,
  },
  ...params,
});

export const constructPopFigure = (
  { figureId, ...params } /*: PopFigureConstructor */
) /*: PopFigure */ => ({
  ...{
    // Default values
    color: "white",
    x: 0,
    y: 0,
  },
  ...params,
});

export const constructTapFigure = (
  { figureId, ...params } /*: TapFigureConstructor */
) /*: TapFigure */ => ({
  ...{
    // Default values
    color: "white",
    x: 0,
    y: 0,
  },
  ...params,
});

export function constructFigure(
  { figureId, ...params } /*: FigureConstructor */
) /*: Figure */ {
  switch (params.type) {
    case "jot":
      return constructJotFigure({ figureId, ...params });
    case "line":
      return constructLineFigure({ figureId, ...params });
    case "pop":
      return constructPopFigure({ figureId, ...params });
    case "tap":
      return constructTapFigure({ figureId, ...params });
    default:
      throw new Error(`unrecognized figure type: ${params.type}`);
  }
}

export function makeFiguresMap(
  figures /*: FigureConstructor[] */
) /*: Map<string, Figure> */ {
  return new Map(
    figures.map(({ figureId, ...figure }) => [
      makeId(figureId),
      constructFigure(figure),
    ])
  );
}

export const createFigure =
  (
    figures /*: FiguresMap */
  ) /*: (figure: FigureConstructor) => { figureId: string, figure: Figure } */ =>
  ({ figureId, ...initFigure }) => {
    const newFigureId = makeId(figureId);
    const newFigure = constructFigure(initFigure);
    setFigure(figures)(newFigureId, newFigure);
    return { figureId: newFigureId, figure: newFigure };
  };

export const getFigure_ =
  (figures /*: FiguresMap */) /*: (figureId: string) => Figure | void */ =>
  (figureId) =>
    figures.get(figureId);

export const getFigure =
  (figures /*: FiguresMap */) /*: (figureId: string) => Figure */ =>
  (figureId) =>
    nonNull(figures.get(figureId), "null figureId");

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

export const deleteFigure =
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
  getFigure_: ReturnType<typeof getFigure_>,
  getFigure: ReturnType<typeof getFigure>,
  hasFigure: ReturnType<typeof hasFigure>,
  setFigure: ReturnType<typeof setFigure>,
  deleteFigure: ReturnType<typeof deleteFigure>,
  setLineType: ReturnType<typeof setLineType>,
}
*/

export function makeFigures(
  initFigures /*: FigureConstructor[] */ = []
) /*: FiguresBundle */ {
  const figures = makeFiguresMap(initFigures);

  return {
    figures,
    createFigure: createFigure(figures),
    getFigure_: getFigure_(figures), // can be null
    getFigure: getFigure(figures),
    hasFigure: hasFigure(figures),
    setFigure: setFigure(figures),
    deleteFigure: deleteFigure(figures),
    setLineType: setLineType(figures),
  };
}
