export function makeDraggable(
  pos /*: {x: number, y: number} */,
  { onStart, onEnd, onMove }
) {
  let dragging = null;

  const start = (event) => {
    const { target, clientX: x, clientY: y, pointerId, button } = event;
    if (button !== 0) return; // left button only
    const allow = onStart?.({ event, x, y });
    if (allow === true || allow === undefined) {
      dragging = { dx: pos.x - x, dy: pos.y - y };
      target.setPointerCapture(pointerId);
    }
  };

  const end = (event) => {
    const { clientX: x, clientY: y } = event;
    onEnd?.({ event, x, y, dragging });
    dragging = null;
  };

  const move = (event) => {
    if (!dragging) return;
    const { clientX: x, clientY: y } = event;

    pos.x = x + dragging.dx;
    pos.y = y + dragging.dy;

    onMove?.({ event, x, y });
  };

  const touchStart = (e) => e.preventDefault();

  return { start, end, move, touchStart };
}
