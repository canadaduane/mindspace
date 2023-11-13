// @flow

export const DEG2RAD = Math.PI / 180;
export const RAD2DEG = 180 / Math.PI;

export function clamp(
  value /*: number */,
  min /*: number */,
  max /*: number */
) /*: number */ {
  return Math.max(min, Math.min(max, value));
}

export function lerp(
  x /*: number */,
  y /*: number */,
  t /*: number */
) /*: number */ {
  return (1 - t) * x + t * y;
}

export function damp(
  x /*: number */,
  y /*: number */,
  lambda /*: number */,
  dt /*: number */
) /*: number */ {
  return lerp(x, y, 1 - Math.exp(-lambda * dt));
}
