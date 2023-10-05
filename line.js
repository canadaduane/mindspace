import { svg } from "./utils.js";
import { lineMaxDistance, lineTransition } from "./constants.js";

export function* Line({ x1, y1, x2, y2 }) {
  for ({ x1, y1, x2, y2 } of this) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const opacity =
      1 -
      1 / (1 + Math.pow(Math.E, (lineMaxDistance - distance) / lineTransition));
    yield svg`<line
      x1=${x1}
      y1=${y1}
      x2=${x2}
      y2=${y2}
      stroke="rgba(240, 240, 240, ${opacity})"
      stroke-width="3"
    />`;
  }
}
