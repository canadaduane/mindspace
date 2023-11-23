import { Circle } from "./circle.js";
import { Line } from "./line.js";
import { Pop } from "./pop.js";
import { Tap } from "./tap.js";

export function getHtmlShapeComponent(type /*: Shape["type"] */) {
  switch (type) {
    case "circle":
      return Circle;
    case "tap":
      return Tap;
    default:
      throw new Error(`unhandled HTML shape type: ${type}`);
  }
}

export function getSvgShapeComponent(type /*: Shape["type"] */) {
  switch (type) {
    case "pop":
      return Pop;
    case "line":
      return Line;
    default:
      throw new Error(`unhandled SVG shape type: ${type}`);
  }
}
