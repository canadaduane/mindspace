// @flow

import { html, closestSide, nonNull } from "./utils.js";
import { tapAnimationMs } from "./constants.js";
import { css } from "./styles.js";
import { startAnimation } from "./animation.js";
import { DEG2RAD, clamp } from "./math/utils.js";
import { Vector2 } from "./math/vector2.js";
import { getColorFromScreenCoord } from "./color.js";

/*::
import type { Side } from "./utils.js";
import type { PointableEvents } from "./pointable.js";
import type { Graph } from "./models/graph.js";
import type { Control } from "./events.js";

export type RainbowFocus = {
  side: Side["side"],
  point: number,
  magnitude: number
};
*/

const viscosity = 0.9;

const wrapIdx = (i /*: number */, length /*: number */) => {
  if (i >= length) return i % length;
  if (i < 0) return length + (i % length);
  return i;
};

export function* RainbowBorder(/*:: this: any, */) /*: any */ {
  const length = 500;
  const heightMap = Array.from({ length }, () => 0);
  const velocityMap = Array.from({ length }, () => 0);

  const propagateWaves = () => {
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
    startAnimation(this, propagateWaves);
  });

  for (const { size, borderThickness: th, focus } of this) {
    const innerWidth = size.width - th * 2;
    const innerHeight = size.height - th * 2;
    const perimeter = innerWidth * 2 + innerHeight * 2;

    const vecWidth = (innerWidth / perimeter) * length;
    const vecHeight = (innerHeight / perimeter) * length;

    // we'll use corners, in vector units, as partial perimeter checkpoints as we draw
    const vecCorner1 = vecWidth;
    const vecCorner2 = vecCorner1 + vecHeight;
    const vecCorner3 = vecCorner2 + vecWidth;
    const vecCorner4 = vecCorner3 + vecHeight;

    // convert vec units to pixels
    const vU = perimeter / vecCorner4;

    const getPosTop = (i /*: number */) => ({ x: th + i * vU, y: th });
    const getPosRight = (i /*: number */) => ({
      x: size.width - th,
      y: th + i * vU,
    });
    const getPosBottom = (i /*: number */) => ({
      x: size.width - th - i * vU,
      y: size.height - th,
    });
    const getPosLeft = (i /*: number */) => ({
      x: th,
      y: size.height - th - i * vU,
    });

    if (focus) {
      let vecFocusPoint;
      if (focus.side === "top") {
        vecFocusPoint = focus.point / vU;
      } else if (focus.side === "right") {
        vecFocusPoint = vecCorner1 + focus.point / vU;
      } else if (focus.side === "bottom") {
        vecFocusPoint = vecCorner3 - focus.point / vU;
      } else if (focus.side === "left") {
        vecFocusPoint = vecCorner4 - focus.point / vU;
      } else {
        throw new Error("no focus point");
      }

      const m = focus.magnitude;

      for (let i /*: number */ = -40; i < vecCorner4 + 40; i++) {
        const dist = i - vecFocusPoint;
        const height = Math.max(0, m - (m * (dist * dist) * vU) / 800);
        if (height > 0) heightMap[wrapIdx(i, length)] = height;
      }
    }

    const cornerRadiusVec = 10;
    const cornerBoostMax = perimeter / (220 / (cornerRadiusVec / 10));
    const cornerHeightBoost = (i /*: number */, max /*: number */) => {
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

    const toBorder = (
      getPos /*: (i: number) => { x: number, y: number} */,
      slice /*: number[] */,
      size /*: number */,
      degStart /*: number */
    ) =>
      slice.map((height, i) => {
        const boost = cornerHeightBoost(i, size);
        const theta =
          DEG2RAD *
          (i < size / 2
            ? degStart - (45 * boost) / cornerBoostMax
            : degStart + (45 * boost) / cornerBoostMax);
        const mag = height + boost;
        const { x, y } = getPos(i);
        return `${x + Math.cos(theta) * mag},${y + Math.sin(theta) * mag}`;
      });

    const path = [].concat(
      /* Top */ toBorder(
        getPosTop,
        heightMap.slice(0, Math.floor(vecCorner1)),
        vecWidth,
        90
      ),
      /* Right */ toBorder(
        getPosRight,
        heightMap.slice(Math.floor(vecCorner1), Math.floor(vecCorner2)),
        vecHeight,
        180
      ),
      /* Bottom */ toBorder(
        getPosBottom,
        heightMap.slice(Math.floor(vecCorner2), Math.floor(vecCorner3)),
        vecWidth,
        270
      ),
      /* Left */ toBorder(
        getPosLeft,
        heightMap.slice(Math.floor(vecCorner3), Math.floor(vecCorner4)),
        vecHeight,
        360
      )
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

          <path d=${"M" + path.join("L")} />
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
function calculateMagnitude(
  t /*: number */,
  d1 /*: number */,
  d2 /*: number */
) {
  const m1 = Math.max(0, 2 * Math.min(t / 2, t - d1));
  const m2 = Math.max(0, 2 * Math.min(t / 2, t - d2));
  return Math.min(t, Math.sqrt(m1 * m1 + m2 * m2));
}

export function getRainbowFocus(
  pos /*: Vector2 */,
  size /*: Vector2 */,
  borderThickness /*: number */,
  threshold /*: number */ = 50
) /*: RainbowFocus */ {
  const closest = closestSide(pos, size);
  const nextClosest = closestSide(pos, size, closest.side);

  const magnitude = calculateMagnitude(
    threshold,
    closest.distance,
    nextClosest.distance
  );

  const th = borderThickness;
  switch (closest.side) {
    case "top":
    case "bottom": {
      const y = closest.side === "bottom" ? size.height - pos.y : pos.y;
      const center = pos.x - size.width / 2;
      const innerWidth = size.width - th * 2;
      const radialWidth = size.width - y * 2;
      const pointScaled = (center / radialWidth) * innerWidth;
      const point = pointScaled + innerWidth / 2;
      return { side: closest.side, point, magnitude };
    }

    case "left":
    case "right": {
      const x = closest.side === "right" ? size.width - pos.x : pos.x;
      const center = pos.y - size.height / 2;
      const innerHeight = size.height - th * 2;
      const radialHeight = size.height - x * 2;
      const pointScaled = (center / radialHeight) * innerHeight;
      const point = pointScaled + innerHeight / 2;
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

export function handleRainbowDrag(
  events /*: PointableEvents */,
  graph /*: Graph */,
  refresh /*: () => void */
) {
  let dragColor /*: ?string */;
  let tapFigureId /*: ?string */;

  const borderStopPropagation = (
    position /*: Vector2 */,
    control /*: Control */
  ) => {
    const winSize = new Vector2(window.innerWidth, window.innerHeight);

    const side = closestSide(position, winSize);
    if (side.distance < 40) {
      control.stop();
    }
  };

  events.on("down", ({ position }, control) => {
    borderStopPropagation(position, control);
  });

  events.on("taptap", ({ position }, control) => {
    borderStopPropagation(position, control);
  });

  events.on("taaap", ({ position }, control) => {
    borderStopPropagation(position, control);
  });

  events.on("dragStart", ({ position }, control) => {
    const winSize = new Vector2(window.innerWidth, window.innerHeight);

    const side = closestSide(position, winSize);
    if (side.distance < 40) {
      dragColor = getColorFromScreenCoord(position, winSize);

      tapFigureId = graph.createFigure({
        type: "tap",
        tapState: "color",
        color: dragColor,
        x: position.x,
        y: position.y,
      }).figureId;

      refresh();

      control.stop();
    }
  });

  events.on("dragEnd", ({ position }, control) => {
    if (dragColor) {
      const jotColor = dragColor;

      const jotFigureIds = graph.findJotsAtPosition(position);
      if (jotFigureIds.length === 0) {
        if (tapFigureId) {
          graph.deleteFigure(tapFigureId);
          tapFigureId = null;
        }
        graph.createJotWithNode(position, jotColor);
      } else {
        if (tapFigureId) {
          graph.updateTap(tapFigureId, { tapState: "destroying" });

          setTimeout(() => {
            if (!tapFigureId) return;

            graph.deleteFigure(tapFigureId);
            tapFigureId = null;

            refresh();
          }, tapAnimationMs);
        }

        for (let figureId of jotFigureIds) {
          const jot = graph.getJot(figureId);
          const node = graph.getNode(jot.controlsNodeId);
          node.color = jotColor;
        }
      }

      refresh();

      dragColor = undefined;

      control.stop();
    }
  });

  events.on("dragMove", ({ position }, control) => {
    if (!tapFigureId) return;

    graph.updateTap(tapFigureId, { x: position.x, y: position.y });

    refresh();
  });
}
