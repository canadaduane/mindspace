import Color from "colorjs.io";
import { calcDistance, refresh, sigmoid, svg } from "./utils.js";
import { lineMaxDistance, lineTransition, orbSize } from "./constants.js";
import { isAnimating, startAnimation, stopAnimation } from "./animation.js";

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

export function* Line({
  shapeId /*: number */,
  x1 /*: number */,
  y1 /*: number */,
  x2 /*: number */,
  y2 /*: number */,
  type = "short" /*: "short" | "strong" | "deleted" */,
  progress /*: number */ = 0,
  progressColor /*: string */ = "red",
  progressDir /*: "in" | "out" */ = "out",
}) {
  const lengthHistory = [];
  const lengthHistoryMax = 20;

  let canBump = true;

  const onClick = (event) => {
    event.stopPropagation();
  };

  for ({ x1, y1, x2, y2, type } of this) {
    if (type === "disabled") {
      yield null;
      continue;
    }

    const length = calcDistance(x1, y1, x2, y2);

    lengthHistory.push(length);
    if (lengthHistory.length > lengthHistoryMax) lengthHistory.shift();

    if (
      canBump &&
      (type === "deleted" || type === "short") &&
      length < orbSize + 5
    ) {
      canBump = false;
      this.dispatchEvent(
        new CustomEvent("setLineType", {
          bubbles: true,
          detail: {
            shapeId,
            lineType: promoteLineType(type),
            bump: true,
          },
        })
      );
    } else if (length > orbSize + 20) {
      canBump = true;
    }

    let line /*: LineProps | undefined */;
    let nearIndicator /*: LineProps| undefined */;

    const changeInLength =
      lengthHistory[lengthHistory.length - 1] - lengthHistory[0];

    const minChange = 5;
    const snapChange = 70;

    if (changeInLength > 0) {
      if (!isAnimating(this)) {
        startAnimation(this);
      }
    } else if (changeInLength === 0) {
      // no more need to animate
      stopAnimation(this);
    }

    if (type === "strong") {
      let strokeWidth = 7;

      if (changeInLength >= minChange) {
        let thinFactor = (changeInLength - minChange) / snapChange;
        if (thinFactor < 1) thinFactor = 1;

        strokeWidth /= thinFactor;

        if (strokeWidth < 2.5) {
          this.dispatchEvent(
            new CustomEvent("setLineType", {
              bubbles: true,
              detail: {
                shapeId,
                lineType: "deleted",
                bump: false,
              },
            })
          );
        }
      }

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

    yield connected &&
      svg`
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
              stroke=${line.stroke}
              stroke-width=${line.strokeWidth}
            />
          `
        }
        ${
          line &&
          progress > 0 &&
          (progressDir === "out"
            ? svg`
            <line
              style="pointer-events: none;"
              x1=${x1}
              y1=${y1}
              x2=${x1 + (x2 - x1) * progress}
              y2=${y1 + (y2 - y1) * progress}
              stroke=${progressColor}
              stroke-width=${line.strokeWidth}
            />
          `
            : svg`
            <line
              style="pointer-events: none;"
              x1=${x2 + (x1 - x2) * progress}
              y1=${y2 + (y1 - y2) * progress}
              x2=${x2}
              y2=${y2}
              stroke=${progressColor}
              stroke-width=${line.strokeWidth}
            />
          `)
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
