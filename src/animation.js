// A set of current animations requiring requestAnimationFrame draw refresh
const animations = new Set();
let animating = false;

export function startAnimation(
  name /*: string */,
  eachFrame /*: () => void */
) {
  animations.add(name);
  let i = 0;
  const loop = () => {
    if (!animating) return;
    eachFrame();
    requestAnimationFrame(loop);
    i++;
  };
  animating = true;
  // Transition from 0 animations to 1 animation means start the loop
  if (animations.size === 1) {
    loop();
  }
}

export function isAnimating(name /*: string */) {
  return animations.has(name);
}

export function stopAnimation(name /*: string */) {
  animations.delete(name);
  // Transition from 1 animation to 0 animations means stop the loop
  if (animations.size === 0) {
    animating = false;
  }
}
