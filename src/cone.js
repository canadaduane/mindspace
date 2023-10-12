import { calcDistance, sigmoid, svg } from "./utils.js";
import { orbSize, orbRectWidth } from "./constants.js";
import Color from "colorjs.io";

// Constant used for bezier control points to approximate circle
const k = 0.5522847498;
const spikeColor = "rgba(240, 60, 30, 1)";
const defaultOrbFill = "rgba(27, 61, 92, 1)";

/**
 * The Cone is the primary create/delete UI mechanism of mindspace. It is called a
 * "cone" because it can be both a circle shape (create), and a pointy shape (delete),
 * depending on the angle you look at it.
 */
export function* Cone({ boostConeCutMode }) {
  const pointHistory = [];
  const noRepeatPointHistory = [];
  const pointHistoryMax = 10;

  const sHistory = [];
  const sHistoryMax = 10;

  let cutMode = false;
  let lastMotionTimestamp;
  let firstMotionTimestamp;

  const setCutMode = (mode /*: boolean */) => {
    if (cutMode === mode) return;
    cutMode = mode;
    this.dispatchEvent(
      new CustomEvent("setCutMode", { bubbles: true, detail: { mode } })
    );
  };

  const setCutPath = (path /*: Point[] */) => {
    this.dispatchEvent(
      new CustomEvent("setCutPath", { bubbles: true, detail: { path } })
    );
  };

  for (let { x, y, color, forceCutMode } of this) {
    const now = Date.now();

    // Track historical points where the mouse/touch events have occurred (used for distance)
    pointHistory.push({ x, y, ts: now });
    if (pointHistory.length > pointHistoryMax) pointHistory.shift();

    // Track historical points, but only when motion is detected (used for direction)
    if (noRepeatPointHistory.length > 0) {
      const q = noRepeatPointHistory[noRepeatPointHistory.length - 1];
      if (x !== q.x || y !== q.y) {
        noRepeatPointHistory.push({ x, y });
        if (noRepeatPointHistory.length > pointHistoryMax)
          noRepeatPointHistory.shift();
      }
    } else {
      noRepeatPointHistory.push({ x, y });
    }

    setCutPath(pointHistory);

    // Calculate total distance travelled over the course of recent memory.
    let distance = 0;
    pointHistory.slice(1).forEach((p, i) => {
      const q = pointHistory[i];
      const segmentDistance = calcDistance(q.x, q.y, p.x, p.y);
      distance += segmentDistance;
    });

    // Calculate total distance travelled, ignoring non-motion
    let noRepeatDistance = 0;
    noRepeatPointHistory.slice(1).forEach((p, i) => {
      const q = noRepeatPointHistory[i];
      const segmentDistance = calcDistance(q.x, q.y, p.x, p.y);
      noRepeatDistance += segmentDistance;
    });

    // Calculate the direction of the drag motion. We want to increase the importance
    // of strongly directional motions (i.e. quick pointer movements) because small
    // motions (e.g. 1 pixel) contain less directional information.  In addition, we
    // want a bias towards recent motion.
    let weightedDX = 0;
    let weightedDY = 0;
    let count = 0;
    noRepeatPointHistory.slice(1).forEach((p, i) => {
      const q = noRepeatPointHistory[i];
      const segmentDistance = calcDistance(q.x, q.y, p.x, p.y);
      if (segmentDistance > 0) {
        const dx = p.x - q.x;
        const dy = p.y - q.y;
        const distanceWeight = segmentDistance / noRepeatDistance;
        const recencyWeight = i / noRepeatPointHistory.length;
        weightedDX += dx * distanceWeight * recencyWeight;
        weightedDY += dy * distanceWeight * recencyWeight;
        count++;
      }
    });
    if (count > 0) {
      weightedDX /= count;
      weightedDY /= count;
    }

    // The calculated direction, in radians, that we should be pointing toward
    let theta = Math.atan2(weightedDY, weightedDX);
    let thetaDeg = (theta * 180) / Math.PI;

    // How far the pointer needs to travel in a given timeframe to switch from
    // a circle to a cutting point:
    let s;

    const timeDelta = now - pointHistory[0].ts;

    if (cutMode || forceCutMode) {
      s = 0;
    } else {
      // Calculate the activation threshold between "create" and "cutter" modes.
      // The opacity transition follows behind the squish, by just a bit.
      if (boostConeCutMode) {
        const activationThreshold = distance / timeDelta;
        s = sigmoid(3 - activationThreshold * 10);
      } else {
        const activationThreshold = distance / timeDelta;
        s = sigmoid(4 - activationThreshold * 3);
      }
    }

    // Track historical s values
    sHistory.push(s);
    if (sHistory.length > sHistoryMax) sHistory.shift();
    const sHistoryAvg = sHistory.reduce((sum, s) => sum + s) / sHistory.length;

    // How much to "squish" the circle in the direction orthogonal to travel
    const squishScale = Math.max(s, 0.25);

    // We want the tip of the cutting point to follow behind the pointer
    const tipX = Math.cos(theta) * (orbSize / 2 - 4);
    const tipY = Math.sin(theta) * (orbSize / 2 - 4);

    // As we transition to cutting point, increase the importance of the follow-behind.
    const tx = x - tipX * (1 - s);
    const ty = y - tipY * (1 - s);

    if (distance > 2) {
      lastMotionTimestamp = now;
    }

    if (cutMode && now - lastMotionTimestamp > 700) {
      // Return to "create" mode after less motion
      setCutMode(false);
    } else if (!cutMode && s < 0.1) {
      // Enter "cutter" mode once motion threshold has been reached
      setCutMode(true);
    }

    const fillColor = new Color(defaultOrbFill).mix(
      spikeColor,
      1 - sHistoryAvg,
      {
        space: "oklab",
        outputSpace: "oklab",
      }
    );

    //       | 0,-
    //    A3 | A4
    // -,0   |
    // ------+-----*  <-- starting point
    //       |   +,0
    //    A2 | A1
    //   +,0 |
    //
    // prettier-ignore
    const r = orbSize/2
    const t = sHistoryAvg;
    // The 'c' value is used to "tuck in" the back of the triangle so its back is curved slightly
    const c = ((1 - t) * r) / 5;
    /**
     * Create 4 approximate arcs to form a circle. When we transition from "circle"
     * to "cutter" shape, we smoothly pull the arcs in to form a triangle. We go
     * around clockwise, starting from the center-right point of the circle to begin
     * arc A1.
     */
    const d =
      `M${r},0 ` +
      // bottom-right arc
      `C${r} ${r * k * /* more pointy */ t},${
        r * k * /* flat point */ t
      } ${r},0 ${r} ` +
      // bottom-left arc
      `C${-r * k * t} ${r},${-r * t + c} ${r * k * t},${-r * t + c / 2} 0 ` +
      // top-left arc
      `C${-r * t + c} ${-r * k * t},${-r * k * t} ${-r},0 ${-r} ` +
      // top-right arc
      `C${r * k * /* flat point */ t} ${-r},${r} ${
        -r * k * /* more pointy */ t
      },${r} 0 `;

    yield svg`
      <g 
        transform="translate(${tx} ${ty}) rotate(${thetaDeg}) scale(1 ${squishScale})"
      > 
        <path
          d=${d}
          stroke=${color}
          stroke-width=${t * 3}
          fill=${fillColor}
        />
      </g> 
    `;
  }
}
