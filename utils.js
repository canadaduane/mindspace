import { jsx } from "@b9g/crank/standalone";

// Export jsx as both html and svg so that we get lit-html syntax highlighting
export { jsx as html, jsx as svg };

export function calcDistance(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

export function sigmoid(ratio) {
  return 1 - 1 / (1 + Math.pow(Math.E, ratio));
}

/*+
type Point = {
  x: number,
  y: number
}
*/

export function isIntersecting(
  a /*: Point */,
  b /*: Point */,
  c /*: Point */,
  d /*: Point */
) {
  const denominator = (b.x - a.x) * (d.y - c.y) - (b.y - a.y) * (d.x - c.x);
  const numerator1 = (a.y - c.y) * (d.x - c.x) - (a.x - c.x) * (d.y - c.y);
  const numerator2 = (a.y - c.y) * (b.x - a.x) - (a.x - c.x) * (b.y - a.y);

  // Detect coincident lines (has a problem, read below)
  if (denominator == 0) return numerator1 == 0 && numerator2 == 0;

  const r = numerator1 / denominator;
  const s = numerator2 / denominator;

  return r >= 0 && r <= 1 && s >= 0 && s <= 1;
}
