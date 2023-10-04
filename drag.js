export function makeDraggable(
  pos /*: {x: number, y: number} */,
  { onStart, onEnd, onMove }
) {
  let dragging = null;

  const start = ({ target, clientX: x, clientY: y, pointerId, button }) => {
    if (button !== 0) return; // left button only
    const allow = onStart?.(x, y);
    if (allow === true || allow === undefined) {
      dragging = { dx: pos.x - x, dy: pos.y - y };
      target.setPointerCapture(pointerId);
    }
  };

  const end = ({ clientX: x, clientY: y }) => {
    onEnd?.(x, y, dragging);
    dragging = null;
  };

  const move = ({ clientX: x, clientY: y }) => {
    if (!dragging) return;

    pos.x = x + dragging.dx;
    pos.y = y + dragging.dy;

    onMove?.(x, y);
  };

  const touchStart = (e) => e.preventDefault();

  return { start, end, move, touchStart };
}
