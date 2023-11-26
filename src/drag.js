// @flow

import { Vector2 } from "./math/vector2.js";

// How far can the drag movement drift from the start position before
// it registers as a "movement" and, e.g. cancels long-press?
const defaultMaxDrift = 3;

const scrollPos = new Vector2();

const getScrollSize = () => {
  const scrollWidth = document.documentElement?.scrollWidth ?? 0;
  const scrollHeight = document.documentElement?.scrollHeight ?? 0;
  return new Vector2(scrollWidth, scrollHeight);
};

export function getScroll() /*: Vector2 */ {
  const doc = document.documentElement;

  if (!doc) return scrollPos;

  scrollPos.set(
    doc.scrollLeft - (doc.clientLeft || 0),
    doc.scrollTop - (doc.clientTop || 0)
  );

  return scrollPos;
}

/*::
type Draggable = {
  onStart: (Omit<DraggableParams, 'didDrift'>) => void,
  onEnd: (DraggableParams) => void,
  onMove: (DraggableParams) => void,
  onLongPress?: ({ x: number, y: number}) => void,
  longPressMs?: number,
  maxDrift?: number,
}

type DraggableHandlers = {
  start: (event: PointerEvent) => void,
  end: (event: PointerEvent) => void,
  move: (event: PointerEvent) => void,
  touchStart: (event: PointerEvent) => void,
  cancel: (event: PointerEvent) => void,
}

type DraggableParams = {
  event: PointerEvent,
  x: number,
  y: number,
  offset: Vector2,
  didDrift: boolean
}

*/

export function makeDraggable(
  pos /*: { x: number, y: number } */,
  {
    onStart,
    onEnd,
    onMove,
    onLongPress,
    longPressMs = 1200,
    maxDrift = defaultMaxDrift,
  } /*: Draggable */
) /*: DraggableHandlers */ {
  let isDragging = false;
  let canceled = false;
  // pixel offset from center of object being dragged
  const offset = new Vector2();
  const worldPos = new Vector2();
  const initialWorldPos = new Vector2();

  let longPressTimeout /*: TimeoutID */;
  let didDrift = false;

  const start = (event /*: PointerEvent */) => {
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
    offset.x = pos.x;
    offset.y = pos.y;
    offset.sub(worldPos);

    const allow = onStart?.({ event, x: worldPos.x, y: worldPos.y, offset });
    if (allow === undefined || allow) {
      // $FlowIgnore
      target.setPointerCapture(pointerId);
    }
  };

  const end = (event /*: PointerEvent */) => {
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

  const move = (event /*: PointerEvent */) => {
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

  const touchStart = (e /*: PointerEvent */) => e.preventDefault();

  const cancel = () => {
    canceled = true;
    clearTimeout(longPressTimeout);
  };

  return { start, end, move, touchStart, cancel };
}
