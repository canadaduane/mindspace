import { jsx } from "@b9g/crank/standalone";

// Export jsx as both html and svg so that we get lit-html syntax highlighting
export const html = jsx;
export const svg = jsx;

export function sigmoid(ratio) {
  return 1 - 1 / (1 + Math.pow(Math.E, ratio));
}

// Similar to sigmoid, but exact bounds [0, 1]; input x is [0, 1]
export function squash(x, sharpness = 10) {
  function g(x) {
    return 1 / (1 + Math.exp(-sharpness * (x - 0.5)));
  }

  let g0 = g(0);
  let g1 = g(1);

  return (g(x) - g0) / (g1 - g0);
}

function getCrankContext(component) {
  return component[Symbol.for("crank.ContextImpl")];
}

const IsSyncExecuting = 1 << 1;
export function isSyncExecuting(component) {
  return getCrankContext(component).f & IsSyncExecuting;
}

const IsUnmounted = 1 << 7;
export function isUnmounted(component) {
  return getCrankContext(component).f & IsUnmounted;
}

export function refresh(component) {
  if (!isSyncExecuting(component)) component.refresh();
}

export function dispatch(component, eventName /*: string */, detail) {
  component.dispatchEvent(
    new CustomEvent(eventName, {
      bubbles: true,
      detail,
    })
  );
}

/*::
type Side = {
  side: "top" | "left" | "right" | "bottom";
  distance: number;
}
*/

export function closestSide(
  x /*: number */,
  y /*: number */,
  w /*: number */,
  h /*: number */
) /*: Side */ {
  const ratio = w / h;
  const diagFall = (w - x) / (h - y);
  const diagRise = x / (h - y);

  if (diagFall < ratio && diagRise < ratio) {
    return { side: "top", distance: y };
  } else if (diagFall < ratio && diagRise > ratio) {
    return { side: "right", distance: w - x };
  } else if (diagFall > ratio && diagRise < ratio) {
    return { side: "left", distance: x };
  } else if (diagFall > ratio && diagRise > ratio) {
    return { side: "bottom", distance: h - y };
  }
}
