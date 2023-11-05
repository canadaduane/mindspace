/* @flow */
import Color from "colorjs.io";

import { getScroll } from "./drag.js";

const C = 0.8;

export function getColorFromScreenCoord(
  x /*: number */,
  y /*: number */,
  w /*: number */,
  h /*: number */
) /*: any */ {
  const a = (x / w - 0.5) * C;
  const b = (y / h - 0.5) * C;
  return new Color("oklab", [1, a, b]).toString();
}

export function getColorFromPolarCoord(
  phi /*: number */,
  lightness /*: number */ = 1.0
) /*: any */ {
  const a = C * Math.cos(phi);
  const b = C * Math.sin(phi);
  // return new Color("oklab", [lightness, a, b]).to("srgb").toString();
  return new Color("oklab", [lightness, a, b]).toString();
}

export function getColorFromWorldCoord(
  x /*: number */,
  y /*: number */
) /*: any */ {
  const { left, top } = getScroll();
  return getColorFromScreenCoord(
    x - left,
    y - top,
    window.innerWidth,
    window.innerHeight
  );
}
