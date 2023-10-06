import Color from "colorjs.io";
import { svg } from "./utils.js";
import { getScroll } from "./drag.js";

export function getColorFromScreenCoord(x, y, w, h) {
  const a = (x / w - 0.5) * 0.8;
  const b = (y / h - 0.5) * 0.8;
  return new Color("oklab", [1, a, b]).toString({
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

export function* ColorWheel({ w, h }) {
  const selectColor =
    (color) =>
    ({ clientX: x, clientY: y }) => {
      this.dispatchEvent(
        new CustomEvent("colorSelected", {
          bubbles: true,
          detail: { color, x, y },
        })
      );
    };
  let classNames = ["fade"];

  // Fade-in transition
  this.schedule(() => {
    setTimeout(() => {
      if (!classNames.includes("fade-in")) {
        classNames.push("fade-in");
        this.refresh();
      }
    }, 100);
  });
  for ({ w, h } of this) {
    const size = w > h ? h : w;
    const { left, top } = getScroll();
    yield svg`
      <svg
          viewBox="0 0 ${w} ${h.innerHeight}"
          style=${
            `width: ${w}px;` +
            `height: ${h}px;` +
            `pointer-events: none;` +
            `position: fixed;` +
            `left: 0px;` +
            `top: 0px;`
          }
          xmlns="http://www.w3.org/2000/svg"
        >
      <g
        transform="translate(${w / 2},${h / 2})"
        class=${classNames.join(" ")}
      >
        ${Array.from({ length: 60 }, (_, i) => {
          const C = 0.3;
          const hue = ((i * 6) / 360) * Math.PI * 2 + Math.PI / 2;
          const a = C * Math.cos(hue);
          const b = C * Math.sin(hue);
          const color = new Color("oklab", [1, a, b]).toString({
            format: "rgba",
          });
          return svg`
            <rect
              onpointerdown=${selectColor(color)} 
              y=${size * 0.42}
              width=${size * 0.025}
              height=${size * 0.035}
              rx=${size * 0.01}
              stroke="none"
              fill=${color}
              transform=${`rotate(${(360 * i) / 60})`}
            />
          `;
        })}
      </g>
      </svg>
    `;
  }
}
