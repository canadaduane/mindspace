import { html } from "./utils.js";
import { getColorFromPolarCoord } from "./color.js";
import { startAnimation } from "./animation.js";

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

  const length = 200;
  const heightMap = Array.from({ length }, () => 0);
  const velocityMap = Array.from({ length }, () => 0);
  let perturbTimeout = 1000;
  const perturb = () => {
    const idx = Math.floor(Math.random() * length);
    velocityMap[idx - 2] += 20;
    velocityMap[idx - 1] += 30;
    velocityMap[idx] += 40;
    velocityMap[idx + 1] += 30;
    velocityMap[idx + 2] += 20;
    setTimeout(perturb, perturbTimeout);
    if (perturbTimeout > 100) perturbTimeout -= 100;
  };
  perturb();

  // heightMap[150] = 20;

  const propagate = () => {
    let left = heightMap[length - 1];
    let right = heightMap[1];
    for (let i = 0; i < length; i++) {
      const preservedLeft = heightMap[i];
      heightMap[i] = (heightMap[i] + left + right) / 3 + velocityMap[i];
      velocityMap[i] -= heightMap[i] / 12;
      velocityMap[i] *= 0.97;
      left = preservedLeft;
      right = heightMap[(i + 2) % length];
    }
    this.refresh();
  };

  this.schedule(() => {
    // startAnimation(this, propagate);
  });

  for (const { w, h, borderThickness } of this) {
    const perimeter =
      (w - borderThickness * 2) * 2 + (h - borderThickness * 2) * 2;
    const vecWidth = Math.floor((w / perimeter) * length);
    const vecHeight = Math.floor((h / perimeter) * length);
    const vecCorner1 = vecWidth;
    const vecCorner2 = vecCorner1 + vecHeight;
    const vecCorner3 = vecCorner2 + vecWidth;
    const vecCorner4 = length - 1;

    // convert vec units to pixels
    const wu = w / vecWidth;
    const hu = h / vecHeight;

    const path = [].concat(
      heightMap.slice(0, vecCorner1).map((height, i) => {
        const theta = Math.PI / 4 + ((Math.PI / 2) * i) / vecWidth;
        const px = borderThickness + i * wu + Math.cos(theta) * height;
        const py = borderThickness + Math.sin(theta) * height;
        return `${i === 0 ? "M" : "L"}${px},${py}`;
      }),
      heightMap.slice(vecCorner1, vecCorner2).map((height, i) => {
        const theta = (Math.PI * 3) / 4 + ((Math.PI / 2) * i) / vecHeight;
        const px = w - borderThickness + Math.cos(theta) * height;
        const py = borderThickness + i * hu + Math.sin(theta) * height;
        return `L${px},${py}`;
      }),
      heightMap.slice(vecCorner2, vecCorner3).map((height, i) => {
        const theta = (Math.PI * 5) / 4 + ((Math.PI / 2) * i) / vecWidth;
        const px = w - borderThickness - i * wu + Math.cos(theta) * height;
        const py = h - borderThickness + Math.sin(theta) * height;
        return `L${px},${py}`;
      }),
      heightMap.slice(vecCorner3, vecCorner4).map((height, i) => {
        const theta = (Math.PI * 7) / 4 + ((Math.PI / 2) * i) / vecHeight;
        const px = borderThickness + Math.cos(theta) * height;
        const py = h - borderThickness - i * hu + Math.sin(theta) * height;
        return `L${px},${py}`;
      })
    );

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

          <path d=${path.join(" ")} />
        </mask>

        <foreignObject width="100%" height="100%" mask="url(#mask)">
          <div class="gradient" xmlns="http://www.w3.org/1999/xhtml"></div>
        </foreignObject>
      </svg>
    `;
  }
}
