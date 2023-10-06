export function getScroll() {
  const doc = document.documentElement;
  const left = doc.scrollLeft - (doc.clientLeft || 0);
  const top = doc.scrollTop - (doc.clientTop || 0);

  return { left, top };
}
export function makeDraggable(
  pos /*: {x: number, y: number} */,
  { onStart, onEnd, onMove }
) {
  let dragging = null;

  const start = (event) => {
    const { target, clientX, clientY, pointerId, button } = event;

    if (button !== 0) return; // left button only

    event.stopPropagation();

    const { left, top } = getScroll();
    const x = clientX + left;
    const y = clientY + top;

    const allow = onStart?.({ event, x, y });
    if (allow === true || allow === undefined) {
      dragging = { dx: pos.x - x, dy: pos.y - y };
      target.setPointerCapture(pointerId);
    }
  };

  const end = (event) => {
    dragging = null;

    const { clientX, clientY } = event;

    const { left, top } = getScroll();
    const x = clientX + left;
    const y = clientY + top;

    onEnd?.({ event, x, y, dragging });
  };

  const move = (event) => {
    if (!dragging) return;

    event.preventDefault();

    const { clientX, clientY } = event;

    const { left, top } = getScroll();
    const x = clientX + left;
    const y = clientY + top;

    pos.x = x + dragging.dx;
    pos.y = y + dragging.dy;

    onMove?.({ event, x, y });
  };

  const touchStart = (e) => e.preventDefault();

  return { start, end, move, touchStart };
}
