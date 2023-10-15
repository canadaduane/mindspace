import { svg } from "./utils.js";
import { orbSize } from "./constants.js";

export function* Pop({ shapeId, x, y, theta, color }) {
  let rate = 0;
  let gap = 0;

  let r = orbSize / 2 - 10;

  let animating = true;

  const animate = () => {
    if (!animating) return;

    x -= Math.cos(theta) * 3;
    y -= Math.sin(theta) * 3;
    r += 4;
    gap += rate;
    rate += 0.05;

    if (gap >= Math.PI * 2) {
      animating = false;
      this.dispatchEvent(
        new CustomEvent("removeShape", {
          bubbles: true,
          detail: { shapeId },
        })
      );
    }
    this.refresh();

    requestAnimationFrame(animate);
  };

  animate();

  for (const {} of this) {
    if (gap < 0 || gap >= Math.PI * 2) {
      yield null;
      continue;
    }

    const minor = gap < Math.PI;
    const ax = Math.cos(-gap / 2) * r;
    const ay = Math.sin(-gap / 2) * r;
    const bx = Math.cos(gap / 2) * r;
    const by = Math.sin(gap / 2) * r;
    const d = `M ${ax} ${ay} A ${r} ${r}, 0, ${minor ? 1 : 0}, 0, ${bx} ${by}`;

    const thetaDeg = (theta * 180) / Math.PI;
    yield svg`
      <g 
        transform="translate(${x} ${y}) rotate(${thetaDeg})"
      > 
        <path
          d=${d}
          stroke=${color}
          stroke-width=${3}
          fill="transparent" 
        />
      </g> 
    `;
  }
}
