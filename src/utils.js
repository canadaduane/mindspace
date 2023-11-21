// @flow
import { jsx } from "@b9g/crank/standalone";

/*::
import { Vector2 } from "./math/vector2.js";
*/

// Export jsx as both html and svg so that we get lit-html syntax highlighting
export const html = jsx;
export const svg = jsx;

export function isFirefox() /*: boolean */ {
  return navigator.userAgent.toLowerCase().indexOf("firefox") > -1;
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
  size /*: Vector2 */,
  discard /*: Side["side"] | void */
) /*: Side */ {
  const sides = [];
  if (discard !== "top") sides.push({ side: "top", distance: pos.y });
  if (discard !== "right")
    sides.push({ side: "right", distance: size.width - pos.x });
  if (discard !== "left") sides.push({ side: "left", distance: pos.x });
  if (discard !== "bottom")
    sides.push({ side: "bottom", distance: size.height - pos.y });
  sides.sort((a, b) => a.distance - b.distance);

  return sides[0];
}
