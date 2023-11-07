// @flow
import { jsx } from "@b9g/crank/standalone";
import { Vector2 } from "./math/vector2.js";

// Export jsx as both html and svg so that we get lit-html syntax highlighting
export const html = jsx;
export const svg = jsx;

export function sigmoid(ratio /*: number */) /*: number */ {
  return 1 - 1 / (1 + Math.pow(Math.E, ratio));
}

// Similar to sigmoid, but exact bounds [0, 1]; input x is [0, 1]
export function squash(
  x /*: number */,
  sharpness /*: number */ = 10
) /*: number */ {
  function g(x /*: number */) {
    return 1 / (1 + Math.exp(-sharpness * (x - 0.5)));
  }

  let g0 = g(0);
  let g1 = g(1);

  return (g(x) - g0) / (g1 - g0);
}

function getCrankContext(component /*: any */) {
  return component[Symbol.for("crank.ContextImpl")];
}

const IsSyncExecuting = 1 << 1;
export function isSyncExecuting(component /*: any */) /*: boolean */ {
  return getCrankContext(component).f & IsSyncExecuting;
}

const IsUnmounted = 1 << 7;
export function isUnmounted(component /*: any */) /*: boolean */ {
  return getCrankContext(component).f & IsUnmounted;
}

export function refresh(component /*: any */) {
  if (!isSyncExecuting(component)) component.refresh();
}

export function dispatch(
  component /*: any */,
  eventName /*: string */,
  detail /*: any */
) {
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
  pos /*: Vector2 */,
  size /*: Vector2 */
) /*: Side */ {
  const ratio = size.width / size.height;
  const diagFall = (size.width - pos.x) / (size.height - pos.y);
  const diagRise = pos.x / (size.height - pos.y);

  if (diagFall < ratio && diagRise < ratio) {
    return { side: "top", distance: pos.y };
  } else if (diagFall < ratio && diagRise > ratio) {
    return { side: "right", distance: size.width - pos.x };
  } else if (diagFall > ratio && diagRise < ratio) {
    return { side: "left", distance: pos.x };
  } else if (diagFall > ratio && diagRise > ratio) {
    return { side: "bottom", distance: size.height - pos.y };
  }

  throw new Error("impossible side");
}
