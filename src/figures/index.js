// @flow
import { createElement } from "@b9g/crank/standalone";

import { Jot } from "./jot.js";
import { Line } from "./line.js";
import { Pop } from "./pop.js";
import { Tap } from "./tap.js";

/*::
import type { Figure, FiguresMap } from "../models/figure";
*/

const directory /*: Record<Figure["type"], ["html" | "svg", any]> */ = {
  jot: ["html", Jot],
  tap: ["html", Tap],
  pop: ["svg", Pop],
  line: ["svg", Line],
};

/**
 * Partitions a FiguresMap into HTML and SVG namespaced components, returning
 * htmlFigures and svgFigures.
 */
export function figuresMapToComponents(
  figures /*: FiguresMap */,
  focusFigureId /*: ?string */
) /*: { htmlFigures: any[], svgFigures: any[] } */ {
  const htmlFigures /*: any[] */ = [];
  const svgFigures /*: any[] */ = [];
  figures.forEach((figure, figureId) => {
    const [namespace, Component] = directory[figure.type];
    if (!Component)
      throw new Error(`unhandled HTML figure type: ${figure.type}`);

    const list = namespace === "svg" ? svgFigures : htmlFigures;
    list.push(
      createElement(Component, {
        $key: figureId,
        figureId,
        focus: figureId === focusFigureId,
        ...figure,
      })
    );
  });
  return { htmlFigures, svgFigures };
}
