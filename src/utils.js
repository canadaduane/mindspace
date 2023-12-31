// @flow
import { jsx } from "@b9g/crank/standalone";
import { nanoid } from "nanoid";
import { Vector2 } from "./math/vector2.js";
import { Box2 } from "./math/box2.js";

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
export type Side = {
  side: "top" | "left" | "right" | "bottom";
  distance: number;
}
*/

export function closestSide(
  pos /*: Vector2 */,
  size /*: Vector2 */,
  discard /*: ?Side["side"] */
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

/*::
type HTMLElementTagNameMap = {
  'body': HTMLBodyElement,
  'div': HTMLDivElement,
};
*/

export function hasTagName /*:: <K: $Keys<HTMLElementTagNameMap>> */(
  el /*: Element | EventTarget | null */,
  tagName /*: K */
) /*: boolean */ {
  return (
    el instanceof HTMLElement &&
    el.tagName.toLowerCase() === tagName.toLowerCase()
  );
}

export function nonNull /*:: <T> */(
  value /*: ?T */,
  errorMessage /*: string */
) /*: T */ {
  if (value == null) throw new Error(errorMessage);
  return value;
}

export function makeId(defaultId /*: ?string */) /*: string */ {
  return defaultId ?? nanoid(12);
}

const scrollPos = new Vector2();

export const getScrollSize = () /*: Vector2 */ => {
  const scrollWidth = document.documentElement?.scrollWidth ?? 0;
  const scrollHeight = document.documentElement?.scrollHeight ?? 0;
  return new Vector2(scrollWidth, scrollHeight);
};

export function getScroll() /*: Vector2 */ {
  const doc = document.documentElement;

  if (!doc) return scrollPos;

  scrollPos.set(
    doc.scrollLeft - (doc.clientLeft || 0),
    doc.scrollTop - (doc.clientTop || 0)
  );

  return scrollPos;
}

export function parse(input /*: string */) /*: any */ {
  function reviver(key /*: string */, value /*: any */) {
    if (typeof value === "object" && value !== null) {
      if (value.dataType === "Map") {
        return new Map(value.value);
      }
    }
    return value;
  }
  return JSON.parse(input, reviver);
}

export function stringify(input /*: any */) /*: string */ {
  function replacer(key /*: string */, value /*: any */) {
    if (value instanceof Map) {
      return {
        dataType: "Map",
        value: Array.from(value.entries()), // or with spread: value: [...value]
      };
    } else if (value instanceof Box2) {
      return undefined;
    } else {
      return value;
    }
  }
  return JSON.stringify(input, replacer, 2);
}

export function debounce /*:: <F: (...args: Array<any>) => mixed> */(
  func /*: F */,
  wait /*: number */
) /*: F */ {
  let timeoutId /*: TimeoutID | null */ = null;

  // $FlowFixMe: Flow can't know this matches F
  return function (...args /*: Array<any> */) {
    const later = () => {
      timeoutId = null;
      func(...args);
    };

    clearTimeout(timeoutId);
    timeoutId = setTimeout(later, wait);
  };
}
