import { calcDistance, sigmoid, svg } from "./utils.js";
import { lineMaxDistance, lineTransition, orbSize } from "./constants.js";

const opacityThreshold = 0.001;

export function promoteLineType(
  type /*: "short" | "strong" | "deleted" | "disabled" */
) {
  switch (type) {
    case "deleted":
      return "short";
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
      return "short";
    case "short":
      return "deleted";
    default:
      return type;
  }
}

export function* Line({
  shapeId,
  x1,
  y1,
  x2,
  y2,
  type = "short" /*: "short" | "strong" | "deleted" */,
}) {
  let canBump = true;

  const onClick = (event) => {
    this.dispatchEvent(new CustomEvent("boostConeCutMode", { bubbles: true }));
  };

  for ({ x1, y1, x2, y2, type } of this) {
    if (type === "disabled") {
      yield null;
      continue;
    }

    const distance = calcDistance(x1, y1, x2, y2);
    if (
      canBump &&
      (type === "deleted" || type === "short") &&
      distance < orbSize + 5
    ) {
      canBump = false;
      this.dispatchEvent(
        new CustomEvent("setLineTypeBump", {
          bubbles: true,
          detail: {
            shapeId,
            lineType: promoteLineType(type),
          },
        })
      );
    } else if (distance > orbSize + 20) {
      canBump = true;
    }

    /*+
    type LineProps = {
      opacity: number 
      strokeWidth: number
      stroke: string
    }
    */

    let line /*: LineProps | undefined */;
    let nearIndicator /*: LineProps| undefined */;

    if (type === "strong") {
      line = {
        opacity: 1,
        strokeWidth: 7,
        stroke: `240, 240, 240, 1`,
      };
    }

    if (type === "short") {
      const s = sigmoid((lineMaxDistance - distance) / lineTransition);
      line = {
        opacity: s,
        strokeWidth: 3,
        stroke: `240, 240, 240, ${s}`,
      };
    }

    if (type === "deleted" || type === "short") {
      const s = sigmoid((120 - distance) / lineTransition);
      nearIndicator = {
        opacity: s,
        strokeWidth: s * 30,
        stroke: `240, 100, 40, ${s}`,
      };
    }

    const connected =
      (line && line.opacity >= opacityThreshold) ||
      (nearIndicator && nearIndicator.opacity >= opacityThreshold);

    yield connected
      ? svg`
          <line
            onpointerdown=${onClick}
            x1=${x1}
            y1=${y1}
            x2=${x2}
            y2=${y2}
            stroke="rgba(0, 0, 0, 0.01)"
            stroke-width=${orbSize}
          />
        ${
          line &&
          svg`
          <line
            style="pointer-events: none;"
            x1=${x1}
            y1=${y1}
            x2=${x2}
            y2=${y2}
            stroke="rgba(${line.stroke})"
            stroke-width=${line.strokeWidth}
          />
        `
        }
        ${
          nearIndicator &&
          svg`
          <line
            style="pointer-events: none;"
            x1=${x1}
            y1=${y1}
            x2=${x2}
            y2=${y2}
            stroke="rgba(${nearIndicator.stroke})"
            stroke-width=${nearIndicator.strokeWidth}
          />
          `
        } 
      `
      : null;
  }
}
