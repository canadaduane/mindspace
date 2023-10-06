import { calcDistance, svg } from "./utils.js";
import {
  lineMaxDistance,
  lineTransition,
  lineEventListenerWidth,
  setGlobalIsDragging,
  pointerIconOffset,
} from "./constants.js";
import { makeDraggable } from "./drag.js";

/*+
type Point = {
  x: number,
  y: number
}
*/

function isIntersecting(
  a /*: Point */,
  b /*: Point */,
  c /*: Point */,
  d /*: Point */
) {
  const denominator = (b.x - a.x) * (d.y - c.y) - (b.y - a.y) * (d.x - c.x);
  const numerator1 = (a.y - c.y) * (d.x - c.x) - (a.x - c.x) * (d.y - c.y);
  const numerator2 = (a.y - c.y) * (b.x - a.x) - (a.x - c.x) * (b.y - a.y);

  // Detect coincident lines (has a problem, read below)
  if (denominator == 0) return numerator1 == 0 && numerator2 == 0;

  const r = numerator1 / denominator;
  const s = numerator2 / denominator;

  return r >= 0 && r <= 1 && s >= 0 && s <= 1;
}

function sigmoid(p, d) {
  return 1 - 1 / (1 + Math.pow(Math.E, p / d));
}

export function* Line({
  shapeId,
  x1,
  y1,
  x2,
  y2,
  type = "short" /*: "short" | "strong" | "deleted" */,
}) {
  let prevType = type;
  let prevX1 = x1,
    prevY1 = y1,
    prevX2 = x2,
    prevY2 = y2;

  const pos = { x: 0, y: 0 };

  let didDrag = false;
  let startDragPos;

  const maybeCutLine = (x, y) => {
    const didCut = isIntersecting(
      startDragPos,
      { x, y },
      { x: prevX1, y: prevY1 },
      { x: prevX2, y: prevY2 }
    );
    if (didCut) {
      this.dispatchEvent(
        new CustomEvent("setLineType", {
          bubbles: true,
          detail: {
            shapeId,
            lineType: prevType === "strong" ? "short" : "deleted",
          },
        })
      );
    }
    return didCut;
  };

  const { start, end, move, touchStart } = makeDraggable(pos, {
    onStart: ({ x, y }) => {
      setGlobalIsDragging(true);
      didDrag = false;
      startDragPos = { x, y };
    },
    onEnd: ({ x, y }) => {
      setTimeout(() => setGlobalIsDragging(false), 50);
      if (didDrag) {
        maybeCutLine(x, y);
        this.dispatchEvent(new CustomEvent("hideSpike", { bubbles: true }));
      } else {
        // another action?
      }
    },
    onMove: ({ event, x: sx, y: sy }) => {
      didDrag = true;
      const distance = calcDistance(startDragPos.x, startDragPos.y, sx, sy);
      const theta = Math.atan2(sy - startDragPos.y, sx - startDragPos.x);
      const x = sx - pointerIconOffset;
      const y = sy - pointerIconOffset;
      if (distance < lineEventListenerWidth) {
        this.dispatchEvent(
          new CustomEvent("showSpike", {
            bubbles: true,
            detail: { x, y, theta: theta + Math.PI / 2 },
          })
        );
      } else {
        if (maybeCutLine(x, y)) {
          // simulate ending the drag, because the element has been removed
          end(event);
        }
        this.dispatchEvent(new CustomEvent("hideSpike", { bubbles: true }));
      }
    },
  });

  let canBump = true;

  for ({ x1, y1, x2, y2, type } of this) {
    // Update our cache of most recent line position
    prevType = type;
    prevX1 = x1;
    prevY1 = y1;
    prevX2 = x2;
    prevY2 = y2;

    const distance = calcDistance(x1, y1, x2, y2);
    if (canBump && (type === "deleted" || type === "short") && distance < 110) {
      canBump = false;
      this.dispatchEvent(
        new CustomEvent("setLineType", {
          bubbles: true,
          detail: {
            shapeId,
            lineType: type === "deleted" ? "short" : "strong",
          },
        })
      );
    } else if (distance > 120) {
      canBump = true;
    }

    let opacity, innerLineWidth, stroke;

    if (type === "strong") {
      opacity = 1;
      innerLineWidth = 7;
      stroke = `240, 240, 240, 1`;
    } else if (type === "deleted") {
      const s = sigmoid(120 - distance, lineTransition);
      opacity = s;
      innerLineWidth = s * 30;
      stroke = `240, 100, 40, ${opacity}`;
    } else if (type === "short") {
      const s = sigmoid(lineMaxDistance - distance, lineTransition);
      opacity = s;
      innerLineWidth = 3;
      stroke = `240, 240, 240, ${opacity}`;
    } else {
      throw new Error(`unknown line type: ${type}`);
    }

    const connected = opacity >= 0.001;

    yield connected
      ? svg`
        <!-- Invisible fat line for events -->
        <line
          onpointerdown=${start}
          onpointerup=${end}
          onpointercancel=${end}
          onpointermove=${move}
          ontouchstart=${touchStart}
          x1=${x1}
          y1=${y1}
          x2=${x2}
          y2=${y2}
          stroke="rgba(${"0, 0, 0, 0.01"})"
          stroke-width=${lineEventListenerWidth}
        />
        <!-- Visible line -->
        <line
          style="pointer-events: none;"
          x1=${x1}
          y1=${y1}
          x2=${x2}
          y2=${y2}
          stroke="rgba(${stroke})"
          stroke-width=${innerLineWidth}
        />
      `
      : null;
  }
}
