// @flow
import { jotCircleRadius, tapRadius } from "../constants.js";
import { Vector2 } from "../math/vector2.js";
import { Box2 } from "../math/box2.js";
import { nonNull, makeId } from "../utils.js";

/*::
import { jotRectangleHeight, jotRectangleWidth } from "../constants";

type JotBase = {
  bbox: Box2; // Cached bounding box for this figure
}

// A "jot" is a note that can be in the shape of a circle or rectangle 
export type JotShape = "circle" | "pill" | "rectangle";
export type JotFigure = { 
  type: "jot";
  controlsNodeId: string;
  shape: JotShape;
  text: string;
  color: string;
  shake: boolean;
  x: number;
  y: number;
  ...JotBase;
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
  ...JotBase;
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
  ...JotBase;
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
  ...JotBase;
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

const constructJotFigure = (
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
    bbox: new Box2(),
  },
  ...params,
});

const constructLineFigure = (
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
    bbox: new Box2(),
  },
  ...params,
});

const constructPopFigure = (
  { figureId, ...params } /*: PopFigureConstructor */
) /*: PopFigure */ => ({
  ...{
    // Default values
    color: "white",
    x: 0,
    y: 0,
    bbox: new Box2(),
  },
  ...params,
});

const constructTapFigure = (
  { figureId, ...params } /*: TapFigureConstructor */
) /*: TapFigure */ => ({
  ...{
    // Default values
    color: "white",
    x: 0,
    y: 0,
    bbox: new Box2(),
  },
  ...params,
});

function constructFigure(
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

function makeFiguresMap(
  figures /*: FigureConstructor[] */
) /*: Map<string, Figure> */ {
  return new Map(
    figures.map(({ figureId, ...figure }) => [
      makeId(figureId),
      constructFigure(figure),
    ])
  );
}

function createFigure(
  figures /*: FiguresMap */,
  { figureId, ...initFigure } /*: FigureConstructor */
) /*: { figureId: string, figure: Figure } */ {
  const newFigureId = makeId(figureId);
  const newFigure = constructFigure(initFigure);
  setFigure(figures, newFigureId, newFigure);
  return { figureId: newFigureId, figure: newFigure };
}

function getFigure_(
  figures /*: FiguresMap */,
  figureId /*: string */
) /*: ?Figure */ {
  return figures.get(figureId);
}

function getFigure(
  figures /*: FiguresMap */,
  figureId /*: string */
) /*: Figure */ {
  return nonNull(figures.get(figureId), "null figureId");
}

function getFigureType /*:: <T: Figure> */(
  figures /*: FiguresMap */,
  typeGuard /*: (figure: Figure) => {typeName: string, type: ?T} */,
  figureId /*: string */
) /*: T */ {
  const { type, typeName } = typeGuard(getFigure(figures, figureId));
  if (!type) throw new Error(`figure is not a ${typeName}: ${figureId}`);
  return type;
}

const jotType = (
  figure /*: Figure */
) /*: { type: ?JotFigure, typeName: string } */ => ({
  type: figure.type === "jot" ? figure : undefined,
  typeName: "JotFigure",
});

const lineType = (
  figure /*: Figure */
) /*: { type: ?LineFigure, typeName: string } */ => ({
  type: figure.type === "line" ? figure : undefined,
  typeName: "LineFigure",
});

const popType = (
  figure /*: Figure */
) /*: { type: ?PopFigure, typeName: string } */ => ({
  type: figure.type === "pop" ? figure : undefined,
  typeName: "PopFigure",
});

const tapType = (
  figure /*: Figure */
) /*: { type: ?TapFigure, typeName: string } */ => ({
  type: figure.type === "tap" ? figure : undefined,
  typeName: "TapFigure",
});

const getJot = function (figures /*: FiguresMap */, figureId /*: string */) {
  return getFigureType(figures, jotType, figureId);
};

const getLine = function (figures /*: FiguresMap */, figureId /*: string */) {
  return getFigureType(figures, lineType, figureId);
};

const getPop = function (figures /*: FiguresMap */, figureId /*: string */) {
  return getFigureType(figures, popType, figureId);
};

const getTap = function (figures /*: FiguresMap */, figureId /*: string */) {
  return getFigureType(figures, tapType, figureId);
};

function hasFigure(
  figures /*: FiguresMap */,
  figureId /*: string */
) /*: boolean */ {
  return figures.has(figureId);
}

function setFigure(
  figures /*: FiguresMap */,
  figureId /*: string */,
  figure /*: Figure */
) /*: FiguresMap */ {
  return figures.set(figureId, figure);
}

function deleteFigure(
  figures /*: FiguresMap */,
  figureId /*: string */
) /*: boolean */ {
  return figures.delete(figureId);
}

function updateJot(
  figures /*: FiguresMap */,
  figureId /*: string */,
  jot /*: Partial<JotFigure> */
) /*: JotFigure */ {
  const figure = getJot(figures, figureId);
  const updated = { ...figure, ...jot };
  setFigure(figures, figureId, updated);
  return updated;
}

function updateLine(
  figures /*: FiguresMap */,
  figureId /*: string */,
  line /*: Partial<LineFigure> */
) /*: LineFigure */ {
  const figure = getLine(figures, figureId);
  const updated = { ...figure, ...line };
  setFigure(figures, figureId, updated);
  return updated;
}

function updatePop(
  figures /*: FiguresMap */,
  figureId /*: string */,
  pop /*: Partial<PopFigure> */
) /*: PopFigure */ {
  const figure = getPop(figures, figureId);
  const updated = { ...figure, ...pop };
  setFigure(figures, figureId, updated);
  return updated;
}

function updateTap(
  figures /*: FiguresMap */,
  figureId /*: string */,
  tap /*: Partial<TapFigure> */
) /*: TapFigure */ {
  const figure = getTap(figures, figureId);
  const updated = { ...figure, ...tap };
  setFigure(figures, figureId, updated);
  return updated;
}

/* Utility Functions */

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

export function updateFigureBoundingBox(figure /*: Figure */) {
  const target = figure.bbox;

  switch (figure.type) {
    case "pop":
      setCircleBoundingBox(target, figure.x, figure.y, jotCircleRadius);
      return;

    case "jot":
      if (figure.shape === "circle") {
        setCircleBoundingBox(target, figure.x, figure.y, jotCircleRadius);
      } else {
        const x = figure.x ?? 0;
        const y = figure.y ?? 0;
        const wHalf = jotRectangleWidth / 2;
        const hHalf = jotRectangleHeight / 2;
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
      setCircleBoundingBox(target, figure.x, figure.y, tapRadius);
      return;
  }
}

/*::
export type FiguresBundle = {
  figures: FiguresMap,

  createFigure: (figure: FigureConstructor) => { figure: Figure, figureId: string },
  getFigure_: (figureId: string) => ?Figure,
  getFigure: (figureId: string) => Figure,
  hasFigure: (figureId: string) => boolean,
  setFigure: (figureId: string, figure: Figure) => FiguresMap,
  updateJot: (figureId: string, Partial<JotFigure>) => JotFigure,
  updateLine: (figureId: string, Partial<LineFigure>) => LineFigure,
  updatePop: (figureId: string, Partial<PopFigure>) => PopFigure,
  updateTap: (figureId: string, Partial<TapFigure>) => TapFigure,
  deleteFigure: (figureId: string) => boolean,
}

type T = Parameters<typeof createFigure>;
*/

export function makeFigures(
  initFigures /*: FigureConstructor[] */ = []
) /*: FiguresBundle */ {
  const figures = makeFiguresMap(initFigures);

  return {
    figures,
    createFigure: (figure) => createFigure(figures, figure),
    getFigure_: (figureId) => getFigure_(figures, figureId), // can return null
    getFigure: (figureId) => getFigure(figures, figureId),
    hasFigure: (figureId) => hasFigure(figures, figureId),
    setFigure: (figureId, figure) => setFigure(figures, figureId, figure),
    updateJot: (figureId, figure) => updateJot(figures, figureId, figure),
    updateLine: (figureId, figure) => updateLine(figures, figureId, figure),
    updatePop: (figureId, figure) => updatePop(figures, figureId, figure),
    updateTap: (figureId, figure) => updateTap(figures, figureId, figure),
    deleteFigure: (figureId) => deleteFigure(figures, figureId),
  };
}
