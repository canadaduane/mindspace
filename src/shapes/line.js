import Color from "colorjs.io";
import { Vector2 } from "../math/vector2.js";
import { dispatch, svg, squash } from "../utils.js";
import {
  distanceFromPointToLine,
  normalizedOrthogonalVectorToPointOnLine,
} from "../math/trig.js";
import { lineMaxDistance, lineTransition, orbSize } from "../constants.js";
import { makeDraggable } from "../drag.js";

const opacityThreshold = 0.001;
const defaultStroke = "rgba(240, 240, 240, 1)";
const warnColor = "rgba(240, 60, 30, 1)";

/*::
type LineProps = {
  opacity: number;
  strokeWidth: number;
  stroke: string;
}
*/

export function* Line({ shapeId /*: string */ }) {
  let canBump = true;
  let broken = false;
  let brokenRatio = 0;

  let isDragging = false;
  const pos = new Vector2(0, 0);
  const dragPos = new Vector2(0, 0);
  const {
    start,
    end,
    move,
    touchStart,
    cancel: cancelDrag,
  } = makeDraggable(pos, {
    onLongPress: () => {
      // nothing for now
    },
    onStart: () => {
      dispatch(this, "selectLine", { shapeId });
    },
    onEnd: () => {
      isDragging = false;
    },
    onMove: ({ x, y }) => {
      isDragging = true;
      dragPos.set(x, y);
      this.refresh();
    },
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
      length < orbSize + 5
    ) {
      canBump = false;
      dispatch(this, "bump", { shapeId, lineType: promoteLineType(type) });
    } else if (length > orbSize + 20) {
      canBump = true;
    }

    let line /*: LineProps | undefined */;
    let nearIndicator /*: LineProps| undefined */;

    if (type === "strong") {
      let strokeWidth = 7;

      const stroke = new Color(defaultStroke).mix(
        warnColor,
        1 - strokeWidth / 7,
        {
          space: "oklab",
          outputSpace: "oklab",
        }
      );

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
      const s = squash((orbSize + 20 - length) / lineTransition);
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
      line.stroke = new Color(defaultStroke).mix(warnColor, rate, {
        space: "oklab",
        outputSpace: "oklab",
      });

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
            dispatch(this, "deleteLine", { shapeId });
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

    yield connected &&
      svg`
        <path d=${path}
          onpointerdown=${start}
          onpointerup=${end}
          onpointercancel=${end}
          onpointermove=${move}
          ontouchstart=${touchStart}
          fill="none"
          stroke=${
            selected && !broken
              ? "rgba(240, 240, 240, 0.1)"
              : "rgba(0, 0, 0, 0.01)"
          } 
          stroke-width=${(orbSize * 2) / 3}
        />
        ${
          line &&
          !broken &&
          svg`
            <path d=${path}
              style="pointer-events: none;"
              fill="none"
              stroke=${line.stroke}
              stroke-width=${line.strokeWidth}
            />
          `
        }
        ${
          line &&
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
          `
        }
        ${
          line &&
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
          `
        }
        ${
          nearIndicator &&
          svg`
            <path d=${path}
              style="pointer-events: none;"
              fill="none"
              stroke="rgba(${nearIndicator.stroke})"
              stroke-width=${nearIndicator.strokeWidth}
            />
          `
        } 
      `;
  }
}

export function promoteLineType(
  type /*: "short" | "strong" | "deleted" | "disabled" */
) {
  switch (type) {
    case "deleted":
      return "strong";
    case "short":
      return "strong";
    default:
      return type;
  }
}

export function demoteLineType(
  type /*: "short" | "strong" | "deleted" | "disabled" */
) {
  switch (type) {
    case "strong":
      return "deleted";
    case "short":
      return "deleted";
    default:
      return type;
  }
}
