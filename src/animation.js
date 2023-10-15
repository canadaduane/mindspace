// A set of current animations requiring requestAnimationFrame draw refresh
const animations = new Map();
let animating = false;

const loop = () => {
  if (!animating) return;

  for (const action of animations.values()) {
    action();
  }

  requestAnimationFrame(loop);
};

export function startAnimation(
  name /*: string */,
  eachFrame /*: () => void */
) {
  animations.set(name, eachFrame);

  if (!animating) {
    animating = true;
    loop();
  }
}

export function isAnimating(name /*: string */) {
  return animating && animations.has(name);
}

export function stopAnimation(name /*: string */) {
  animations.delete(name);

  // Transition from 1 animation to 0 animations means stop the loop
  if (animations.size === 0) {
    animating = false;
  }
}
