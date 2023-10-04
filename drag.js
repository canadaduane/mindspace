export function makeDraggable(
  pos /*: {x: number, y: number} */,
  { onStart, onEnd, onMove }
) {
  let dragging = null;

  const start = ({ target, clientX: x, clientY: y, pointerId, button }) => {
    if (button !== 0) return; // left button only
    dragging = { dx: pos.x - x, dy: pos.y - y };
    target.setPointerCapture(pointerId);
    onStart?.();
  };

  const end = (_event) => {
    dragging = null;
    onEnd?.();
  };

  const move = ({ clientX: x, clientY: y }) => {
    if (!dragging) return;

    pos.x = x + dragging.dx;
    pos.y = y + dragging.dy;

    onMove?.();
  };

  return { start, end, move };
}
