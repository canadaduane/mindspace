import { calcDistance, svg } from "./utils.js";
import { lineMaxDistance, lineTransition } from "./constants.js";

export function* Line({
  shapeId,
  x1,
  y1,
  x2,
  y2,
  selected = false,
  deleted = false,
}) {
  const onClick = (event) => {
    this.dispatchEvent(
      new CustomEvent("toggleSelectedLine", {
        bubbles: true,
        detail: { shapeId },
      })
    );
    event.stopPropagation();
  };

  for ({ x1, y1, x2, y2, selected, deleted } of this) {
    const distance = calcDistance(x1, y1, x2, y2);
    if (deleted && distance < 110) {
      this.dispatchEvent(
        new CustomEvent("undeleteLine", {
          bubbles: true,
          detail: { shapeId },
        })
      );
    }

    // Sigmoid function determines line visibility, based on line length (distance)
    const opacity =
      1 -
      1 /
        (1 +
          Math.pow(
            Math.E,
            ((deleted ? 120 : lineMaxDistance) - distance) / lineTransition
          ));

    const selectedLineWidth = opacity * 15;

    const innerLineWidth = deleted ? opacity * 30 : 3;

    const connected = opacity >= 0.001;

    yield connected
      ? svg`
        <line
          onpointerdown=${onClick}
          x1=${x1}
          y1=${y1}
          x2=${x2}
          y2=${y2}
          stroke="rgba(${selected ? "90, 90, 240, 0.9" : "0, 0, 0, 0.01"})"
          stroke-width=${selectedLineWidth}
        />
        <line
          style="pointer-events: none;"
          x1=${x1}
          y1=${y1}
          x2=${x2}
          y2=${y2}
          stroke="rgba(${
            deleted ? `240, 100, 40, ${opacity}` : `240, 240, 240, ${opacity}`
          })"
          stroke-width=${innerLineWidth}
        />
      `
      : null;
  }
}
