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

    // we'll use corners, in vector units, as partial perimeter checkpoints as we draw
    const vecCorner1 = vecWidth;
    const vecCorner2 = vecCorner1 + vecHeight;
    const vecCorner3 = vecCorner2 + vecWidth;
    const vecCorner4 = vecCorner3 + vecHeight;

    // convert vec units to pixels
    const vU = perimeter / vecCorner4;

    if (focus) {
      let vecPoint;
      if (focus.side === "top") {
        vecPoint = (focus.point - borderThickness) / vU;
      } else if (focus.side === "right") {
        vecPoint = vecCorner1 + (focus.point - borderThickness) / vU;
      } else if (focus.side === "bottom") {
        vecPoint = vecCorner3 - (focus.point - borderThickness) / vU;
      } else if (focus.side === "left") {
        vecPoint = vecCorner4 - (focus.point - borderThickness) / vU;
      }

      const m = focus.magnitude;

      for (let i = 0; i < vecCorner4; i++) {
        const dist = i - vecPoint;
        const height = Math.max(0, m - (m * (dist * dist) * vU) / 800);
        if (height > 0) heightMap[i] = height;
      }
    }

    const cornerRadiusVec = 10;
    const cornerBoostMax = perimeter / (220 / (cornerRadiusVec / 10));
    const cornerHeightBoost = (i, max) => {
      const p = 2;
      if (i < cornerRadiusVec) {
        return (
          Math.pow(
            1 + Math.cos(Math.PI / 2 + ((i / cornerRadiusVec) * Math.PI) / 2),
            p
          ) * cornerBoostMax
        );
      } else if (i >= max - cornerRadiusVec) {
        const k = max - i;
        return (
          Math.pow(
            1 + Math.cos(Math.PI / 2 + ((k / cornerRadiusVec) * Math.PI) / 2),
            p
          ) * cornerBoostMax
        );
      } else {
        return 0;
      }
    };

    const path = [].concat(
      // Top
      heightMap.slice(0, vecCorner1).map((height, i) => {
        const boost = cornerHeightBoost(i, vecWidth);
        const theta =
          DEG2RAD *
          (i < vecWidth / 2
            ? 90 - (45 * boost) / cornerBoostMax
            : 90 + (45 * boost) / cornerBoostMax);
        const mag = height + boost;
        const px = borderThickness + i * vU + Math.cos(theta) * mag;
        const py = borderThickness + Math.sin(theta) * mag;
        return `${i === 0 ? "M" : "L"}${px},${py}`;
      }),
      // Right
      heightMap.slice(vecCorner1, vecCorner2).map((height, i) => {
        const boost = cornerHeightBoost(i, vecHeight);
        const theta =
          DEG2RAD *
          (i < vecHeight / 2
            ? 180 - (45 * boost) / cornerBoostMax
            : 180 + (45 * boost) / cornerBoostMax);
        const mag = height + boost;
        const px = size.width - borderThickness + Math.cos(theta) * mag;
        const py = borderThickness + i * vU + Math.sin(theta) * mag;
        return `L${px},${py}`;
      }),
      // Bottom
      heightMap.slice(vecCorner2, vecCorner3).map((height, i) => {
        const boost = cornerHeightBoost(i, vecWidth);
        const theta =
          DEG2RAD *
          (i < vecHeight / 2
            ? 270 - (45 * boost) / cornerBoostMax
            : 270 + (45 * boost) / cornerBoostMax);
        const mag = height + boost;
        const px =
          size.width - borderThickness - i * vU + Math.cos(theta) * mag;
        const py = size.height - borderThickness + Math.sin(theta) * mag;
        return `L${px},${py}`;
      }),
      // Left
      heightMap.slice(vecCorner3, vecCorner4).map((height, i) => {
        const boost = cornerHeightBoost(i, vecHeight);
        const theta =
          DEG2RAD *
          (i < vecHeight / 2
            ? 360 - (45 * boost) / cornerBoostMax
            : 0 + (45 * boost) / cornerBoostMax);
        const mag = height + boost;
        const px = borderThickness + Math.cos(theta) * mag;
        const py =
          size.height - borderThickness - i * vU + Math.sin(theta) * mag;
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

// Given a threshold t, and two distances that may or may not be within that
// threshold, calculate a magnitude of influence
function calculateMagnitude(t, d1, d2) {
  const m1 = Math.max(0, 2 * Math.min(t / 2, t - d1));
  const m2 = Math.max(0, 2 * Math.min(t / 2, t - d2));
  return Math.min(t, Math.sqrt(m1 * m1 + m2 * m2));
}

export function getRainbowFocus(pos, size, threshold = 50) {
  const closest = closestSide(pos, size);
  const nextClosest = closestSide(pos, size, closest.side);

  const magnitude = calculateMagnitude(
    threshold,
    closest.distance,
    nextClosest.distance
  );
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
