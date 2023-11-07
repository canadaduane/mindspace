import { Vector2 } from "./math/vector2.js";
import { calcDistance } from "./trig.js";

const longPressMaxDrift = 3;

const scrollPos = new Vector2();
export function getScroll() {
  const doc = document.documentElement;

  scrollPos.set(
    doc.scrollLeft - (doc.clientLeft || 0),
    doc.scrollTop - (doc.clientTop || 0)
  );

  return scrollPos;
}

export function makeDraggable(
  pos /*: {x: number, y: number} */,
  { onStart, onEnd, onMove, onLongPress, longPressMs = 1200 }
) {
  let isDragging = false;
  let canceled = false;
  // pixel offset from center of object being dragged
  const offset = new Vector2();
  const worldPos = new Vector2();

  let longPressTimeout /*: Timeout */;
  let longPressIsPossible = true;
  const longPressInitialPos = new Vector2();

  const start = (event) => {
    const { target, clientX, clientY, pointerId, button } = event;

    if (button !== 0) return; // left button only

    event.stopPropagation();

    canceled = false;

    worldPos.set(clientX, clientY).add(getScroll());

    longPressIsPossible = true;
    longPressInitialPos.copy(worldPos);

    longPressTimeout = setTimeout(() => {
      if (!longPressIsPossible) return;
      onLongPress?.({ x: worldPos.x, y: worldPos.y });
    }, longPressMs);

    isDragging = true;
    offset.copy(pos).sub(worldPos);

    const allow = onStart?.({ event, x: worldPos.x, y: worldPos.y, offset });
    if (allow === true || allow === undefined) {
      target.setPointerCapture(pointerId);
    }
  };

  const end = (event) => {
    if (canceled) return;

    isDragging = false;

    const { clientX, clientY } = event;

    worldPos.set(clientX, clientY).add(getScroll());

    clearTimeout(longPressTimeout);

    onEnd?.({ event, x: worldPos.x, y: worldPos.y });
  };

  const move = (event) => {
    if (canceled) return;
    if (!isDragging) return;

    event.preventDefault();

    const { clientX, clientY } = event;

    worldPos.set(clientX, clientY).add(getScroll());

    const longPressDriftDistance = worldPos.distanceTo(longPressInitialPos);
    if (longPressDriftDistance >= longPressMaxDrift) {
      longPressIsPossible = false;
    }

    pos.x = worldPos.x + offset.x;
    pos.y = worldPos.y + offset.y;
    // pos.copy(worldPos).add(offset);

    onMove?.({ event, x: worldPos.x, y: worldPos.y, offset });
  };

  const touchStart = (e) => e.preventDefault();

  const cancel = () => {
    canceled = true;
    clearTimeout(longPressTimeout);
  };

  return { start, end, move, touchStart, cancel };
}
