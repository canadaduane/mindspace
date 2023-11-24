// @flow
import { createElement } from "@b9g/crank/standalone";

import { Circle } from "./circle.js";
import { Line } from "./line.js";
import { Pop } from "./pop.js";
import { Tap } from "./tap.js";

/*::
import type { Shape, ShapesMap } from "../models/shape";
*/

const directory /*: Record<Shape["type"], ["html" | "svg", any]> */ = {
  circle: ["html", Circle],
  tap: ["html", Tap],
  pop: ["svg", Pop],
  line: ["svg", Line],
};

/**
 * Partitions a ShapesMap into HTML and SVG namespaced components, returning
 * htmlShapes and svgShapes.
 */
export function shapesMapToComponents(
  shapes /*: ShapesMap */
) /*: { htmlShapes: any[], svgShapes: any[] } */ {
  const htmlShapes /*: any[] */ = [];
  const svgShapes /*: any[] */ = [];
  shapes.forEach((shape, shapeId) => {
    const [namespace, Component] = directory[shape.type];
    if (!Component) throw new Error(`unhandled HTML shape type: ${shape.type}`);

    const list = namespace === "svg" ? svgShapes : htmlShapes;
    list.push(createElement(Component, { $key: shapeId, shapeId, ...shape }));
  });
  return { htmlShapes, svgShapes };
}
