import { html, closestSide } from "./utils.js";
import { css } from "./styles.js";
import { startAnimation } from "./animation.js";

const viscosity = 0.9;

export function* RainbowBorder() {
  const length = 500;
  const heightMap = Array.from({ length }, () => 0);
  const velocityMap = Array.from({ length }, () => 0);

  const propagate = () => {
    let left = heightMap[length - 1];
    let right = heightMap[1];
    for (let i = 0; i < length; i++) {
      const preservedLeft = heightMap[i];
      heightMap[i] = (heightMap[i] + left + right) / 3 + velocityMap[i];
      velocityMap[i] -= heightMap[i] / 12;
      velocityMap[i] *= viscosity;
      left = preservedLeft;
      right = heightMap[(i + 2) % length];
    }
    this.refresh();
  };

  this.schedule(() => {
    startAnimation(this, propagate);
  });

  for (const { size, borderThickness, focus } of this) {
    const perimeter =
      (size.width - borderThickness * 2) * 2 +
      (size.height - borderThickness * 2) * 2;
    const vecWidth = Math.floor((size.width / perimeter) * length);
    const vecHeight = Math.floor((size.height / perimeter) * length);
    const vecCorner1 = vecWidth;
    const vecCorner2 = vecCorner1 + vecHeight;
    const vecCorner3 = vecCorner2 + vecWidth;
    const vecCorner4 = length - 1;

    // convert vec units to pixels
    const wu = size.width / vecWidth;
    const hu = size.height / vecHeight;

    if (focus) {
      let vecPoint;
      let vecMax;
      let getIdx;
      if (focus.side === "top") {
        vecPoint = focus.point / wu;
        vecMax = vecWidth;
        getIdx = (i) => i;
      } else if (focus.side === "bottom") {
        vecPoint = focus.point / wu;
        vecMax = vecWidth;
        getIdx = (i) => vecCorner3 - i;
      } else if (focus.side === "left") {
        vecPoint = focus.point / hu;
        vecMax = vecHeight;
        getIdx = (i) => vecCorner4 - i;
      } else if (focus.side === "right") {
        vecPoint = focus.point / hu;
        vecMax = vecHeight;
        getIdx = (i) => vecCorner1 + i;
      }

      const m = focus.magnitude;

      for (let i = 0; i < vecMax; i++) {
        const dist = Math.abs(i - vecPoint);
        const height = Math.max(0, m - (m * (dist * dist)) / vecMax);
        if (height > 0) heightMap[getIdx(i)] = height;
      }
    }

    const path = [].concat(
      heightMap.slice(0, vecCorner1).map((height, i) => {
        const theta = Math.PI / 4 + ((Math.PI / 2) * i) / vecWidth;
        const px = borderThickness + i * wu + Math.cos(theta) * height;
        const py = borderThickness + Math.sin(theta) * height;
        return `${i === 0 ? "M" : "L"}${px},${py}`;
      }),
      heightMap.slice(vecCorner1, vecCorner2).map((height, i) => {
        const theta = (Math.PI * 3) / 4 + ((Math.PI / 2) * i) / vecHeight;
        const px = size.width - borderThickness + Math.cos(theta) * height;
        const py = borderThickness + i * hu + Math.sin(theta) * height;
        return `L${px},${py}`;
      }),
      heightMap.slice(vecCorner2, vecCorner3).map((height, i) => {
        const theta = (Math.PI * 5) / 4 + ((Math.PI / 2) * i) / vecWidth;
        const px =
          size.width - borderThickness - i * wu + Math.cos(theta) * height;
        const py = size.height - borderThickness + Math.sin(theta) * height;
        return `L${px},${py}`;
      }),
      heightMap.slice(vecCorner3, vecCorner4).map((height, i) => {
        const theta = (Math.PI * 7) / 4 + ((Math.PI / 2) * i) / vecHeight;
        const px = borderThickness + Math.cos(theta) * height;
        const py =
          size.height - borderThickness - i * hu + Math.sin(theta) * height;
        return `L${px},${py}`;
      })
    );

    yield html`
      <svg
        viewBox="0 0 ${size.width} ${size.height}"
        style=${{
          "width": `${size.width}px`,
          "height": `${size.height}px`,
          "pointer-events": "none",
          "position": "fixed",
          "left": 0,
          "top": 0,
        }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <mask id="mask">
          <rect
            x="0"
            y="0"
            width=${size.width}
            height=${size.height}
            fill="white"
          />

          <path d=${path.join(" ")} />
        </mask>

        <foreignObject width="100%" height="100%" mask="url(#mask)">
          <div class="gradient" xmlns="http://www.w3.org/1999/xhtml" />
        </foreignObject>
      </svg>
    `;
  }
}

export function getRainbowFocus(pos, size) {
  const closest = closestSide(pos, size);

  const threshold = 50;
  const magnitude = Math.max(
    0,
    2 * Math.min(threshold / 2, threshold - closest.distance)
  );
  switch (closest.side) {
    case "top":
    case "bottom":
      return { side: closest.side, point: pos.x, magnitude };

    case "left":
    case "right":
      return { side: closest.side, point: pos.y, magnitude };
  }
}

function styles() {
  const N = 30;
  const hues = Array.from({ length: N + 1 }, (_, i) => (i * 360) / N);

  css`
    div.gradient {
      width: 100%;
      height: 100%;
      background-image: conic-gradient(
        from 120deg,
        ${hues
          .map((hue, i) => `hwb(${hue} 20% 0%) ${(i / N) * 100}%`)
          .join(",\n")}
      );
    }
  `;
}

styles();
