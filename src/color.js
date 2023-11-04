import Color from "colorjs.io";
import { getScroll } from "./drag.js";

const C = 0.8;

export function getColorFromScreenCoord(x, y, w, h) {
  const a = (x / w - 0.5) * C;
  const b = (y / h - 0.5) * C;
  return new Color("oklab", [1, a, b]).toString({
    format: "rgba",
  });
}

export function getColorFromPolarCoord(phi, lightness = 1.0) {
  const a = C * Math.cos(phi);
  const b = C * Math.sin(phi);
  return new Color("oklab", [lightness, a, b]).toString({
    format: "rgba",
  });
}

export function getColorFromWorldCoord(x, y) {
  const { left, top } = getScroll();
  return getColorFromScreenCoord(
    x - left,
    y - top,
    window.innerWidth,
    window.innerHeight
  );
}
