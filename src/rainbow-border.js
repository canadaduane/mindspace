import { html } from "./utils.js";
import { getColorFromPolarCoord } from "./color.js";

export function* RainbowBorder() {
  const N = 12;
  const radians = Array.from({ length: N }, (_, i) => (i * Math.PI * 2) / N);

  const css = html`<style>
    div.gradient {
      width: 100%;
      height: 100%;
      background-image: conic-gradient(
        from 90deg,
        ${radians
          .map((r, i) => `${getColorFromPolarCoord(r)} ${(i / 12) * 100}%`)
          .join(",\n")}
      );
    }
  </style>`;

  for (const { w, h, borderWidth: b } of this) {
    yield html`
      ${css}
      <svg
        viewBox="0 0 ${w} ${h}"
        style=${{
          "width": `${w}px`,
          "height": `${h}px`,
          "pointer-events": "none",
          "position": "fixed",
          "left": 0,
          "top": 0,
        }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <mask id="mask">
          <rect x="0" y="0" width=${w} height=${h} fill="white" />
          <rect
            x=${b}
            y=${b}
            width=${w - b * 2}
            height=${h - b * 2}
            rx=${b}
            ry=${b}
          />
        </mask>

        <foreignObject width="100%" height="100%" mask="url(#mask)">
          <div class="gradient" xmlns="http://www.w3.org/1999/xhtml"></div>
        </foreignObject>
      </svg>
    `;
  }
}
