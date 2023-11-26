/* @flow */
import Color from "colorjs.io";
import { Vector2 } from "./math/vector2.js";
import { getScroll } from "./utils.js";

export function getColorFromScreenCoord(
  p /*: Vector2 */,
  s /*: Vector2 */
) /*: string */ {
  const x = p.x - s.width / 2;
  const y = p.y - s.height / 2;
  const hue = ((-Math.atan2(x, y) / Math.PI) * 180 + 60) % 360;
  return getColorFromPolarCoord(hue, 0.2, 0);
}

export function getColorFromPolarCoord(
  hue /*: number */,
  white /*: number */,
  black /*: number */
) /*: string */ {
  return `hwb(${hue} ${white * 100}% ${black * 100}%)`;
}

export function getColorFromWorldCoord(p /*: Vector2 */) /*: string */ {
  const scroll = getScroll();
  const size = new Vector2(window.innerWidth, window.innerHeight);
  return getColorFromScreenCoord(p.clone().sub(scroll), size);
}
