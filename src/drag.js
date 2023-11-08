import { Vector2 } from "./math/vector2.js";
import { calcDistance } from "./trig.js";

// How far can the drag movement drift from the start position before
// it registers as a "movement" and, e.g. cancels long-press?
const defaultMaxDrift = 3;

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
  {
    onStart,
    onEnd,
    onMove,
    onLongPress = undefined,
    longPressMs = 1200,
    maxDrift = defaultMaxDrift,
  }
) {
  let isDragging = false;
  let canceled = false;
  // pixel offset from center of object being dragged
  const offset = new Vector2();
  const worldPos = new Vector2();
  const initialWorldPos = new Vector2();

  let longPressTimeout /*: Timeout */;
  let didDrift = false;

  const start = (event) => {
    const { target, clientX, clientY, pointerId, button } = event;

    if (button !== 0) return; // left button only

    event.stopPropagation();

    worldPos.set(clientX, clientY).add(getScroll());
    initialWorldPos.copy(worldPos);

    didDrift = false;

    longPressTimeout = setTimeout(() => {
      if (didDrift) return;
      onLongPress?.({ x: worldPos.x, y: worldPos.y });
    }, longPressMs);

    canceled = false;

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

    onEnd?.({
      event,
      x: worldPos.x,
      y: worldPos.y,
      offset,
      didDrift,
    });
  };

  const move = (event) => {
    if (canceled) return;
    if (!isDragging) return;

    event.preventDefault();

    const { clientX, clientY } = event;

    worldPos.set(clientX, clientY).add(getScroll());

    const driftDistance = worldPos.distanceTo(initialWorldPos);
    if (driftDistance >= maxDrift) {
      didDrift = true;
    }

    pos.x = worldPos.x + offset.x;
    pos.y = worldPos.y + offset.y;
    // pos.copy(worldPos).add(offset);

    onMove?.({ event, x: worldPos.x, y: worldPos.y, offset, didDrift });
  };

  const touchStart = (e) => e.preventDefault();

  const cancel = () => {
    canceled = true;
    clearTimeout(longPressTimeout);
  };

  return { start, end, move, touchStart, cancel };
}
