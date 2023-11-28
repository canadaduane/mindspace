// @flow

import { createEvents } from "./events.js";
import { Vector2 } from "./math/vector2.js";

// How far can the drag movement drift from the start position before
// it registers as a "movement" and, e.g. cancels long-press?
const defaultMaxDrift = 3;

/*::
import type { Emitter } from "./events.js";

type PointableEmitterEvents = {
  "start": (Omit<PointableEventPayload, "didDrift">) => void,
  "end": (PointableEventPayload) => void,
  "move": (PointableEventPayload) => void,
  "longPress": ({ x: number, y: number}) => void,
}

export type PointableEvents = Emitter<PointableEmitterEvents>;

export type PointableOptions = {
  getWorldPosition?: () => Vector2,
  longPressMs?: number,
  maxDrift?: number,
  allowStart?: (params: Omit<PointableEventPayload, "didDrift">) => boolean,
  screenToWorld?: (Vector2) => void
}

export type PointableBundle = {
  events: PointableEvents,
  position: Vector2,
  handlers: PointableHandlers,
  cancel: () => void,
}

export type PointableHandlers = {
  start: (event: PointerEvent) => void,
  end: (event: PointerEvent) => void,
  move: (event: PointerEvent) => void,
  touchStart: (event: PointerEvent) => void,
}

export type PointableEventPayload = {
  event: PointerEvent,
  x: number,
  y: number,
  offset: Vector2,
  didDrift: boolean
}

export type PointableState = {
  state: "startSingle",
  x: number,
  y: number
} | {
  // state
}
*/

export function makePointable({
  getWorldPosition,
  allowStart = () => true,
  longPressMs = 1200,
  maxDrift = defaultMaxDrift,
  screenToWorld,
} /*: PointableOptions */ = {}) /*: PointableBundle */ {
  let isDragging = false;
  let canceled = false;

  const position = new Vector2();
  // pixel offset from center of object being dragged
  const offset = new Vector2();
  const initialPosition = new Vector2();
  const p = new Vector2();
  const q = new Vector2();

  let longPressTimeout /*: TimeoutID */;
  let didDrift = false;

  const events = createEvents/*:: <PointableEmitterEvents> */();

  const start = (event /*: PointerEvent */) => {
    // left button only
    if (event.button !== 0) return;

    event.stopPropagation();

    const { target, clientX, clientY, pointerId } = event;

    // Temp var to hold screen coords converted to world coords
    p.set(clientX, clientY).transform(screenToWorld);

    const prestartPos = getWorldPosition?.();
    if (prestartPos) {
      // Offset of the "grab point" on the thing being dragged
      offset.copy(prestartPos).sub(p);
    } else {
      offset.set(0, 0);
    }

    // Update the position
    position.copy(p);

    // Keep a copy of initial start position for drift distance calculation
    initialPosition.copy(position);

    didDrift = false;

    const pressPosition = new Vector2().copy(position);
    longPressTimeout = setTimeout(() => {
      if (didDrift) return;
      events.emit("longPress", { x: pressPosition.x, y: pressPosition.y });
    }, longPressMs);

    canceled = false;

    isDragging = true;

    const startParams = { event, x: position.x, y: position.y, offset };
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

    position.set(clientX, clientY).add(offset).transform(screenToWorld);

    clearTimeout(longPressTimeout);

    events.emit("end", {
      event,
      x: position.x,
      y: position.y,
      offset,
      didDrift,
    });
  };

  const move = (event /*: PointerEvent */) => {
    if (canceled) return;
    if (!isDragging) return;

    event.preventDefault();

    const { clientX, clientY } = event;

    position.set(clientX, clientY).add(offset).transform(screenToWorld);

    const driftDistance = position.distanceTo(initialPosition);
    if (driftDistance >= maxDrift) {
      didDrift = true;
    }

    events.emit("move", {
      event,
      x: position.x,
      y: position.y,
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
