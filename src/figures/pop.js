import { isSyncExecuting, dispatch, svg } from "../utils.js";
import { jotCircleRadius } from "../constants.js";

export function* Pop({ figureId, x, y, theta, color }) {
  let gapGrowthRate = 0;
  let gap = 0;
  let thickness = 3;

  let r = jotCircleRadius + 15;

  let animating = true;

  const animate = () => {
    if (!animating) return;

    x -= Math.cos(theta) * 3;
    y -= Math.sin(theta) * 3;
    r += 2;
    gap += gapGrowthRate;
    gapGrowthRate += 0.05;
    thickness -= 0.3;
    if (thickness < 0.5) thickness = 0.5;

    if (gap >= Math.PI * 2) {
      animating = false;
      dispatch(this, "destroyShape", { figureId });
    }

    if (!isSyncExecuting) this.refresh();

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
          stroke-width=${thickness}
          fill="transparent" 
        />
      </g> 
    `;
  }
}
