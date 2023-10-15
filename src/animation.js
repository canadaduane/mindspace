import { isUnmounted, refresh } from "./utils.js";

// A set of current animations requiring requestAnimationFrame draw refresh
const animations = new Map();
let animating = false;

const loop = () => {
  if (!animating) return;

  for (const [component, action] of animations.entries()) {
    if (isUnmounted(component)) {
      console.warn("unmounted while animating, stopping animation", component);
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

  requestAnimationFrame(loop);
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
