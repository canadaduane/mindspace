// @flow

import { Vector2 } from "../math/vector2.js";
import {
  distanceFromPointToLine,
  normalizedOrthogonalVectorToPointOnLine,
} from "../math/trig.js";
import {
  lineMaxDistance,
  lineTransition,
  jotCircleRadius,
} from "../constants.js";
import { dispatch, html, svg, squash } from "../utils.js";
import { makePointable } from "../pointable.js";
import { lerp } from "../math/utils.js";

const opacityThreshold = 0.001;
const defaultColorLch = [0.6522, 0, 29.25];
const warnColorLch = [0.6522, 0.3344, 29.25];

function mix(
  c1 /*: [number, number, number] */,
  c2 /*: [number, number, number] */,
  ratio /*: number */
) {
  return [
    lerp(c1[0], c2[0], ratio),
    lerp(c1[1], c2[1], ratio),
    lerp(c1[2], c2[2], ratio),
  ];
}

/*::
import type { LineType } from "../models/figure.js";

type LineProps = {
  opacity: number;
  strokeWidth: number;
  stroke: string;
}
*/

export function* Line(
  /*:: this: any, */ { figureId } /*: { figureId: string } */
) /*: any */ {
  let canBump = false;
  let broken = false;
  let brokenRatio = 0;

  let isDragging = false;
  const dragPos = new Vector2(0, 0);
  const { events, handlers, cancel: cancelDrag } = makePointable();

  events.on("down", () => {
    dispatch(this, "selectLine", { figureId });
  });

  events.on("dragEnd", () => {
    isDragging = false;
  });

  events.on("dragMove", ({ position }) => {
    isDragging = true;
    dragPos.copy(position);
    this.refresh();
  });

  const p1 = new Vector2();
  const p2 = new Vector2();
  for (const { x1, y1, x2, y2, lineType: type, selected } of this) {
    if (type === "disabled") {
      yield null;
      continue;
    }

    p1.set(x1, y1);
    p2.set(x2, y2);

    const length = p1.distanceTo(p2);

    if (
      canBump &&
      (type === "deleted" || type === "short") &&
      length < jotCircleRadius * 2 + 5
    ) {
      canBump = false;
      dispatch(this, "bump", { figureId, lineType: promoteLineType(type) });
    } else if (length > jotCircleRadius * 2 + 20) {
      canBump = true;
    }

    let line /*: ?LineProps */;
    let nearIndicator /*: ?LineProps */;

    if (type === "strong") {
      let strokeWidth = 7;

      const stroke = `oklch(${mix(
        defaultColorLch,
        warnColorLch,
        1 - strokeWidth / 7
      ).join(" ")})`;

      line = {
        opacity: 1,
        strokeWidth,
        stroke,
      };
    }

    if (type === "short") {
      const s = squash((lineMaxDistance - length) / lineTransition);
      line = {
        opacity: s,
        strokeWidth: 3,
        stroke: `rgba(240, 240, 240, ${s})`,
      };
    }

    if (type === "deleted" || type === "short") {
      const s = squash((jotCircleRadius * 2 + 20 - length) / lineTransition);
      nearIndicator = {
        opacity: s,
        strokeWidth: s * 30,
        stroke: `rgba(240, 240, 240, ${s})`,
      };
    }

    const connected =
      (line && line.opacity >= opacityThreshold) ||
      (nearIndicator && nearIndicator.opacity >= opacityThreshold);

    let path;

    if (isDragging && line) {
      path = `M${p1.x} ${p1.y} Q${dragPos.x} ${dragPos.y}, ${p2.x} ${p2.y}`;

      const perpDist = distanceFromPointToLine(dragPos, p1, p2);

      const maxDist = 150;
      const rate = broken
        ? 0.99
        : squash(Math.min(perpDist, maxDist) / maxDist, 30);

      const m = mix(defaultColorLch, warnColorLch, rate);
      // line.stroke = `oklch(${m.join(",")})`;
      line.stroke = `oklch(${m[0] * 100}% ${m[1]} ${m[2]})`;
      console.log({ r: rate, m, c: line.stroke });

      if (rate >= 1) {
        // isDragging = false;
        cancelDrag();
        broken = true;
        const vec = normalizedOrthogonalVectorToPointOnLine(dragPos, p1, p2);
        const incrBrokenRatio = () => {
          brokenRatio += 0.1;
          dragPos.x += (vec.x * 10) / brokenRatio;
          dragPos.y += (vec.y * 10) / brokenRatio;
          if (brokenRatio >= 1) {
            isDragging = false;
            broken = false;
            brokenRatio = 0;
            dispatch(this, "deleteLine", { figureId });
          } else {
            this.refresh();
            requestAnimationFrame(incrBrokenRatio);
          }
        };
        requestAnimationFrame(incrBrokenRatio);
      }
    } else {
      path = `M${p1.x} ${p1.y} L${p2.x} ${p2.y}`;
    }

    console.log({ nearIndicator });

    yield connected &&
      html`
        <path
          d=${path}
          onpointerdown=${handlers.start}
          onpointerup=${handlers.end}
          onpointercancel=${handlers.end}
          onpointermove=${handlers.move}
          ontouchstart=${handlers.touchStart}
          fill="none"
          stroke=${selected && !broken
            ? "rgba(240, 240, 240, 0.1)"
            : "rgba(0, 0, 0, 0.01)"}
          stroke-width=${(jotCircleRadius * 4) / 3}
        />
        ${line &&
        !broken &&
        svg`
            <path d=${path}
              style="pointer-events: none;"
              fill="none"
              stroke=${line.stroke}
              stroke-width=${line.strokeWidth}
            />
          `}
        ${line &&
        broken &&
        svg`
            <path d=${path}
              style="pointer-events: none;"
              fill="none"
              stroke=${line.stroke}
              stroke-width=${line.strokeWidth}
              stroke-dasharray=${`${50 - brokenRatio * 20} 100`}
              stroke-dashoffset="0"
              pathLength="100"
            />
          `}
        ${line &&
        broken &&
        svg`
            <path d=${path}
              style="pointer-events: none;"
              fill="none"
              stroke=${line.stroke}
              stroke-width=${line.strokeWidth}
              stroke-dasharray="100 100"
              stroke-dashoffset=${`${-50 - brokenRatio * 20}`}
              pathLength="100"
            />
          `}
      `;
  }
}

export function promoteLineType(type /*: LineType */) /*: LineType */ {
  switch (type) {
    case "deleted":
      return "strong";
    case "short":
      return "strong";
    default:
      return type;
  }
}

export function demoteLineType(type /*: LineType */) /*: LineType */ {
  switch (type) {
    case "strong":
      return "deleted";
    case "short":
      return "deleted";
    default:
      return type;
  }
}
