import { html, closestSide } from "./utils.js";
import { css } from "./styles.js";
import { startAnimation } from "./animation.js";
import { DEG2RAD } from "./math/utils.js";

const viscosity = 0.9;

const wrapIdx = (i, length) => {
  if (i >= length) return i % length;
  if (i < 0) return length + (i % length);
  return i;
};

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
      right = heightMap[wrapIdx(i + 2, length)];
    }
    this.refresh();
  };

  this.schedule(() => {
    startAnimation(this, propagate);
  });

  for (const { size, borderThickness, focus } of this) {
    const innerWidth = size.width - borderThickness * 2;
    const innerHeight = size.height - borderThickness * 2;

    const perimeter = innerWidth * 2 + innerHeight * 2;
    const vecWidth = Math.floor((innerWidth / perimeter) * length);
    const vecHeight = Math.floor((innerHeight / perimeter) * length);
    const vecCorner1 = vecWidth;
    const vecCorner2 = vecCorner1 + vecHeight;
    const vecCorner3 = vecCorner2 + vecWidth;
    const vecCorner4 = vecCorner3 + vecHeight;

    // convert vec units to pixels
    const wu = innerWidth / vecWidth;
    const hu = innerHeight / vecHeight;

    if (focus) {
      let vecPoint;
      let vecMax;
      let getIdx;
      if (focus.side === "top") {
        vecPoint = (focus.point - borderThickness) / wu;
        vecMax = vecWidth;
        getIdx = (i) => wrapIdx(i, length);
      } else if (focus.side === "bottom") {
        vecPoint = (focus.point - borderThickness) / wu;
        vecMax = vecWidth;
        getIdx = (i) => wrapIdx(vecCorner3 - i, length);
      } else if (focus.side === "left") {
        vecPoint = (focus.point - borderThickness) / hu;
        vecMax = vecHeight;
        getIdx = (i) => wrapIdx(vecCorner4 - i, length);
      } else if (focus.side === "right") {
        vecPoint = (focus.point - borderThickness) / hu;
        vecMax = vecHeight;
        getIdx = (i) => wrapIdx(vecCorner1 + i, length);
      }

      const m = focus.magnitude;

      for (let i = -40; i < vecMax + 40; i++) {
        const dist = Math.abs(i - vecPoint);
        const height = Math.max(0, m - (m * (dist * dist)) / vecMax);
        if (height > 0) heightMap[getIdx(i)] = height;
      }
    }

    const cornerBoost = perimeter / 220;
    const cornerHeightBoost = (i, max) => {
      const p = 2;
      if (i < 10) {
        return (
          Math.pow(1 + Math.cos(Math.PI / 2 + ((i / 10) * Math.PI) / 2), p) *
          cornerBoost
        );
      } else if (i >= max - 10) {
        const k = max - i;
        return (
          Math.pow(1 + Math.cos(Math.PI / 2 + ((k / 10) * Math.PI) / 2), p) *
          cornerBoost
        );
      } else {
        return 0;
      }
    };

    const path = [].concat(
      heightMap.slice(0, vecCorner1).map((height, i) => {
        const theta = DEG2RAD * (45 + (90 * i) / vecWidth);
        const mag = height + cornerHeightBoost(i, vecWidth);
        const px = borderThickness + i * wu + Math.cos(theta) * mag;
        const py = borderThickness + Math.sin(theta) * mag;
        return `${i === 0 ? "M" : "L"}${px},${py}`;
      }),
      heightMap.slice(vecCorner1, vecCorner2).map((height, i) => {
        const theta = DEG2RAD * (135 + (90 * i) / vecHeight);
        const mag = height + cornerHeightBoost(i, vecHeight);
        const px = size.width - borderThickness + Math.cos(theta) * mag;
        const py = borderThickness + i * hu + Math.sin(theta) * mag;
        return `L${px},${py}`;
      }),
      heightMap.slice(vecCorner2, vecCorner3).map((height, i) => {
        const theta = DEG2RAD * (225 + (90 * i) / vecWidth);
        const mag = height + cornerHeightBoost(i, vecWidth);
        const px =
          size.width - borderThickness - i * wu + Math.cos(theta) * mag;
        const py = size.height - borderThickness + Math.sin(theta) * mag;
        return `L${px},${py}`;
      }),
      heightMap.slice(vecCorner3, vecCorner4).map((height, i) => {
        const theta = DEG2RAD * (315 + (90 * i) / vecHeight);
        const mag = height + cornerHeightBoost(i, vecHeight);
        const px = borderThickness + Math.cos(theta) * mag;
        const py =
          size.height - borderThickness - i * hu + Math.sin(theta) * mag;
        // return i === vecHeight - 1 ? "z" : `L${px},${py}`;
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

export function getRainbowFocus(pos, size, threshold = 50) {
  const closest = closestSide(pos, size);
  const nextClosest = closestSide(pos, size, closest.side);

  const t = threshold;
  const m1 = Math.max(0, 2 * Math.min(t / 2, t - closest.distance));
  const m2 = Math.max(0, 2 * Math.min(t / 2, t - nextClosest.distance));
  const magnitude = Math.sqrt(m1 * m1 + m2 * m2);
  switch (closest.side) {
    case "top":
    case "bottom": {
      const point = pos.x;
      return { side: closest.side, point, magnitude };
    }

    case "left":
    case "right": {
      const point = pos.y;
      return { side: closest.side, point, magnitude };
    }
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
