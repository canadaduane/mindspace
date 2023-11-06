/* @flow */
import Color from "colorjs.io";

import { getScroll } from "./drag.js";

const C = 0.4;

export function getColorFromScreenCoord(
  x /*: number */,
  y /*: number */,
  w /*: number */,
  h /*: number */
) /*: any */ {
  const hue = ((-Math.atan2(x - w / 2, y - h / 2) / Math.PI) * 180 + 60) % 360;
  return getColorFromPolarCoord(hue, 0.2, 0);
}

export function getColorFromPolarCoord(
  hue /*: number */,
  white /*: number */,
  black /*: number */
) /*: any */ {
  return `hwb(${hue} ${white * 100}% ${black * 100}%)`;
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
