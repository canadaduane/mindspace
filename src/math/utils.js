export const DEG2RAD = Math.PI / 180;
export const RAD2DEG = 180 / Math.PI;

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function lerp(x, y, t) {
  return (1 - t) * x + t * y;
}

export function damp(x, y, lambda, dt) {
  return lerp(x, y, 1 - Math.exp(-lambda * dt));
}
