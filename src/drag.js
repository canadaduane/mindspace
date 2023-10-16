import { calcDistance } from "./utils.js";

const longPressMaxDrift = 3;

export function getScroll() {
  const doc = document.documentElement;
  const left = doc.scrollLeft - (doc.clientLeft || 0);
  const top = doc.scrollTop - (doc.clientTop || 0);

  return { left, top };
}
export function makeDraggable(
  pos /*: {x: number, y: number} */,
  { onStart, onEnd, onMove, onLongPress, longPressMs = 1200 }
) {
  let dragging = null;

  let longPressTimeout /*: Timeout */;
  let longPressIsPossible = true;
  const longPressInitialPos = { x: 0, y: 0 };

  const start = (event) => {
    const { target, clientX, clientY, pointerId, button } = event;

    if (button !== 0) return; // left button only

    event.stopPropagation();

    const { left, top } = getScroll();
    const x = clientX + left;
    const y = clientY + top;

    longPressIsPossible = true;
    longPressInitialPos.x = x;
    longPressInitialPos.y = y;

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
    dragging = null;

    const { clientX, clientY } = event;

    const { left, top } = getScroll();
    const x = clientX + left;
    const y = clientY + top;

    clearTimeout(longPressTimeout);

    onEnd?.({ event, x, y });
  };

  const move = (event) => {
    if (!dragging) return;

    event.preventDefault();

    const { clientX, clientY } = event;

    const { left, top } = getScroll();
    const x = clientX + left;
    const y = clientY + top;

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

  return { start, end, move, touchStart };
}
