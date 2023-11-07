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
  let dragging = null;
  let canceled = false;

  let longPressTimeout /*: Timeout */;
  let longPressIsPossible = true;
  const longPressInitialPos = new Vector2();

  const start = (event) => {
    const { target, clientX, clientY, pointerId, button } = event;

    if (button !== 0) return; // left button only

    event.stopPropagation();

    canceled = false;

    const scroll = getScroll();
    const x = clientX + scroll.x;
    const y = clientY + scroll.y;

    longPressIsPossible = true;
    longPressInitialPos.set(x, y);

    longPressTimeout = setTimeout(() => {
      if (!longPressIsPossible) return;
      onLongPress?.({ x, y });
    }, longPressMs);

    dragging = { dx: pos.x - x, dy: pos.y - y };
    const allow = onStart?.({ event, x, y, dx: dragging.dx, dy: dragging.dy });
    if (allow === true || allow === undefined) {
      target.setPointerCapture(pointerId);
    }
  };

  const end = (event) => {
    if (canceled) return;

    dragging = null;

    const { clientX, clientY } = event;

    const scroll = getScroll();
    const x = clientX + scroll.x;
    const y = clientY + scroll.y;

    clearTimeout(longPressTimeout);

    onEnd?.({ event, x, y });
  };

  const move = (event) => {
    if (canceled) return;
    if (!dragging) return;

    event.preventDefault();

    const { clientX, clientY } = event;

    const scroll = getScroll();
    const x = clientX + scroll.x;
    const y = clientY + scroll.y;

    const longPressDriftDistance = calcDistance(
      x,
      y,
      longPressInitialPos.x,
      longPressInitialPos.y
    );
    if (longPressDriftDistance >= longPressMaxDrift) {
      longPressIsPossible = false;
    }

    pos.x = x + dragging.dx;
    pos.y = y + dragging.dy;

    onMove?.({ event, x, y, dx: dragging.dx, dy: dragging.dy });
  };

  const touchStart = (e) => e.preventDefault();

  const cancel = () => {
    canceled = true;
    clearTimeout(longPressTimeout);
  };

  return { start, end, move, touchStart, cancel };
}
