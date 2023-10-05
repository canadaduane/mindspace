import Color from "colorjs.io";
import { svg } from "./utils.js";

export function getColorFromCoord(x, y, w, h) {
  const a = (x / w - 0.5) * 0.8;
  const b = (y / h - 0.5) * 0.8;
  return new Color("oklab", [1, a, b]).toString({
    format: "rgba",
  });
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
    yield svg`
      <g
        transform="translate(${w / 2},${h / 2})"
        style="pointer-events: none"
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
    `;
  }
}