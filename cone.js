import { calcDistance, sigmoid, svg } from "./utils.js";
import { orbSize, orbRectWidth } from "./constants.js";

/**
 * The Cone is the primary create/delete UI mechanism of mindspace. It is called a
 * "cone" because it can be both a circle shape (create), and a pointy shape (delete),
 * depending on the angle you look at it.
 */
export function* Cone({
  x,
  y,
  dragDX,
  dragDY,
  color,
  forceCutMode,
  boostConeCutMode,
}) {
  const pointHistory = [];
  const noRepeatPointHistory = [];
  const pointHistoryMax = 10;

  const sHistory = [];
  const sHistoryMax = 5;

  let cutMode = false;

  const setCutMode = (mode /*: boolean */) => {
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

  for (let { x, y, dragDX, dragDY, color, forceCutMode } of this) {
    // Track historical points where the mouse/touch events have occurred (used for distance)
    pointHistory.push({ x, y });
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
    const activationThreshold = (boostConeCutMode ? 1 : 7) * pointHistoryMax;
    const s = forceCutMode ? 0 : sigmoid((activationThreshold - distance) / 20);

    // Track historical s values
    sHistory.push(s);
    if (sHistory.length > sHistoryMax) sHistory.shift();
    const sHistoryAvg = sHistory.reduce((sum, s) => sum + s) / sHistory.length;

    // How much to "squish" the circle in the direction orthogonal to travel
    const squishScale = Math.max(s, 0.25);

    // The opacity transition follows behind the squish, by just a bit
    const spikeOpacity = forceCutMode
      ? 1
      : 1 - sigmoid((activationThreshold + 20 - distance) / 10);
    const orbOpacity = 1 - spikeOpacity;

    // Shrink the circle towards a certain size as it transitions to cutting point
    const radius = orbSize / 2 - (1 - sHistoryAvg) * orbSize * 0.33;

    // We want the tip of the cutting point to follow behind the pointer
    const tipX = Math.cos(theta) * (orbSize / 2 - 10);
    const tipY = Math.sin(theta) * (orbSize / 2 - 10);

    // As we transition to cutting point, diminish the importance of the original
    // tap location on the circle, and increase the importance of the follow-behind.
    const tx = x - dragDX * (1 - s) - tipX * (1 - s);
    const ty = y - dragDY * (1 - s) - tipY * (1 - s);

    if (s < 0.1 && !cutMode) {
      setCutMode(true);
    } else if (s >= 0.3 && cutMode) {
      setCutMode(false);
    }

    yield svg`
      ${pointHistory.slice(1).map((p, i) => {
        const q = pointHistory[i];
        const tx = tipX * (1 - s);
        const ty = tipY * (1 - s);
        return svg`
          <line
            x1=${q.x - tx}
            y1=${q.y - ty}
            x2=${p.x - tx}
            y2=${p.y - ty}
            stroke-width="2"
            stroke="rgb(240, 240, 240,${i / pointHistory.length})"
            opacity=${spikeOpacity}
          />
        `;
      })}}
      <g 
        transform="translate(${tx} ${ty}) rotate(${thetaDeg}) scale(1 ${squishScale})"
      > 
        <circle
          r=${radius}
          stroke=${color}
          stroke-width="3" 
          opacity=${orbOpacity}
          fill="var(--defaultOrbFill)"
        /> 
        <path
          d="M0,40 Q25 0,50 0 Q25 0,0 -40 Z"
          stroke="rgba(240, 60, 30, 1)"
          fill="rgba(240, 60, 30, 1)"
          stroke-width="0"
          opacity=${spikeOpacity}
        />
      </g> 
    `;
  }
}