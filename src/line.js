import Color from "colorjs.io";
import { calcDistance, dispatch, sigmoid, svg } from "./utils.js";
import { lineMaxDistance, lineTransition, orbSize } from "./constants.js";
import { getScroll, makeDraggable } from "./drag.js";

const opacityThreshold = 0.001;
const defaultStroke = "rgba(240, 240, 240, 1)";
const warnColor = "rgba(240, 60, 30, 1)";

/*+
type LineProps = {
  opacity: number 
  strokeWidth: number
  stroke: string
}
*/

export function* Line({ shapeId /*: string */ }) {
  let canBump = true;

  let isDragging = false;
  const pos = { x: 0, y: 0 };
  const dragPos = { x: 0, y: 0 };
  const { start, end, move, touchStart } = makeDraggable(pos, {
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
      dragPos.x = x;
      dragPos.y = y;
      this.refresh();
    },
  });

  for (const { x1, y1, x2, y2, type, selected } of this) {
    if (type === "disabled") {
      yield null;
      continue;
    }

    const length = calcDistance(x1, y1, x2, y2);

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
      const s = sigmoid((lineMaxDistance - length) / lineTransition);
      line = {
        opacity: s,
        strokeWidth: 3,
        stroke: `rgba(240, 240, 240, ${s})`,
      };
    }

    if (type === "deleted" || type === "short") {
      const s = sigmoid((orbSize + 20 - length) / lineTransition);
      nearIndicator = {
        opacity: s,
        strokeWidth: s * 30,
        stroke: `rgba(240, 240, 240, ${s})`,
      };
    }

    const connected =
      (line && line.opacity >= opacityThreshold) ||
      (nearIndicator && nearIndicator.opacity >= opacityThreshold);

    const path = isDragging
      ? `M${x1} ${y1} Q${dragPos.x} ${dragPos.y}, ${x2} ${y2}`
      : `M${x1} ${y1} L${x2} ${y2}`;

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
            selected ? "rgba(240, 240, 240, 0.1)" : "rgba(0, 0, 0, 0.01)"
          } 
          stroke-width=${(orbSize * 2) / 3}
        />
        ${
          line &&
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
