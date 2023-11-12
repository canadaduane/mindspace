import { isUnmounted, refresh } from "./utils.js";

// A set of current animations requiring requestAnimationFrame draw refresh
const animations = new Map();
let animating = false;

async function* nextFrame(fps) {
  let then = performance.now();
  const interval = 1000 / fps;
  let delta = 0;

  while (true) {
    let now = await new Promise(requestAnimationFrame);
    if (now - then < interval - delta) continue;
    delta = Math.min(interval, delta + now - then - interval);
    then = now;

    yield now;
  }
}

const loop = async (fps = 60) => {
  for await (const time of nextFrame(fps)) {
    if (!animating) return;

    for (const [component, action] of animations.entries()) {
      if (isUnmounted(component)) {
        console.warn(
          "unmounted while animating, stopping animation",
          component
        );
        stopAnimation(component);
        continue;
      }
      try {
        action();
      } catch (e) {
        console.warn("error while animating", component);
        stopAnimation(component);
        throw e;
      }
    }
  }
};

export function startAnimation(
  component /*: string */,
  eachFrame /*: () => void */
) {
  const defaultEachFrame = () => refresh(component);
  animations.set(component, eachFrame ?? defaultEachFrame);

  if (!animating) {
    animating = true;
    loop();
  }
}

export function isAnimating(component) {
  return animating && animations.has(component);
}

export function stopAnimation(component) {
  animations.delete(component);

  // Transition from 1 animation to 0 animations means stop the loop
  if (animations.size === 0) {
    animating = false;
  }
}
