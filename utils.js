import { jsx } from "@b9g/crank/standalone";

// Export jsx as both html and svg so that we get lit-html syntax highlighting
export { jsx as html, jsx as svg };

export function calcDistance(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}
