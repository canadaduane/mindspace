// @flow

import { createEvents } from "./events.js";
import { Vector2 } from "./math/vector2.js";
import { getScroll } from "./utils.js";

// How far can the drag movement drift from the start position before
// it registers as a "movement" and, e.g. cancels long-press?
const defaultMaxDrift = 3;

/*::
import type { Emitter } from "./events.js";

export type DraggableEventTypes = {
  "start": (Omit<DraggableEventPayload, "didDrift">) => void,
  "end": (DraggableEventPayload) => void,
  "move": (DraggableEventPayload) => void,
  "longPress": ({ x: number, y: number}) => void,
}

export type DraggableEvents = Emitter<DraggableEventTypes>;

export type DraggableOptions = {
  position?: Vector2,
  longPressMs?: number,
  maxDrift?: number,
  allowStart?: (params: Omit<DraggableEventPayload, "didDrift">) => boolean,
}

export type DraggableBundle = {
  events: DraggableEvents,
  position: Vector2,
  handlers: DraggableHandlers,
  cancel: () => void,
}

export type DraggableHandlers = {
  start: (event: PointerEvent) => void,
  end: (event: PointerEvent) => void,
  move: (event: PointerEvent) => void,
  touchStart: (event: PointerEvent) => void,
}

export type DraggableEventPayload = {
  event: PointerEvent,
  x: number,
  y: number,
  offset: Vector2,
  didDrift: boolean
}
*/

export function makeDraggable({
  position = new Vector2(),
  allowStart = () => true,
  longPressMs = 1200,
  maxDrift = defaultMaxDrift,
} /*: DraggableOptions */ = {}) /*: DraggableBundle */ {
  let isDragging = false;
  let canceled = false;

  // pixel offset from center of object being dragged
  const offset = new Vector2();
  const worldPos = new Vector2();
  const initialWorldPos = new Vector2();

  let longPressTimeout /*: TimeoutID */;
  let didDrift = false;

  const events = createEvents/*:: <DraggableEventTypes> */();

  const start = (event /*: PointerEvent */) => {
    const { target, clientX, clientY, pointerId, button } = event;

    if (button !== 0) return; // left button only

    event.stopPropagation();

    worldPos.set(clientX, clientY).add(getScroll());
    initialWorldPos.copy(worldPos);

    didDrift = false;

    longPressTimeout = setTimeout(() => {
      if (didDrift) return;
      events.emit("longPress", { x: worldPos.x, y: worldPos.y });
    }, longPressMs);

    canceled = false;

    isDragging = true;

    // Offset of grab point on the dragged thing
    offset.copy(position).sub(worldPos);

    const startParams = { event, x: worldPos.x, y: worldPos.y, offset };
    if (allowStart(startParams)) {
      events.emit("start", startParams);
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

    events.emit("end", {
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

    position.copy(worldPos).add(offset);

    events.emit("move", {
      event,
      x: worldPos.x,
      y: worldPos.y,
      offset,
      didDrift,
    });
  };

  const touchStart = (e /*: PointerEvent */) => e.preventDefault();

  return {
    events,
    position,
    handlers: { start, end, move, touchStart },
    cancel: () => {
      canceled = true;
      clearTimeout(longPressTimeout);
    },
  };
}
