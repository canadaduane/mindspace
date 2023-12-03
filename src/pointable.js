// @flow

import { createEvents } from "./events.js";
import { Vector2 } from "./math/vector2.js";

// How far can the drag movement drift from the start position before
// it registers as a "movement" and, e.g. cancels long-press?
const defaultMaxDrift = 3;

/*::
import type { Emitter } from "./events.js";

type PointableEmitterEvents = {
  // Basic down/up: can occur multiple times in a single pointable cycle,
  // e.g. a double tap has two down and two up events. 
  "down": (PointableEventPayload) => void,
  "up": (PointableEventPayload) => void,
  "move": (PointableEventPayload) => void,

  "singleDown": (PointableEventPayload) => void,
  "singleUp": (PointableEventPayload) => void,
  "tap": (PointableEventPayload) => void,

  "doubleDown": (PointableEventPayload) => void,
  "doubleUp": (PointableEventPayload) => void,
  "taptap": (PointableEventPayload) => void,

  "longDown": (PointableEventPayload) => void,
  "longUp": (PointableEventPayload) => void,
  "taaap": (PointableEventPayload) => void,

  "dragStart": (PointableEventPayload) => void,
  "dragDrift": (PointableEventPayload) => void,
  "dragMove": (PointableEventPayload) => void,
  "dragMoveOrDrift": (PointableEventPayload) => void,
  "dragEnd": (PointableEventPayload) => void,
}

type ScreenToWorldFn = (Vector2) => void;
type WorldPositionFn = () => Vector2;

export type PointableEvents = Emitter<PointableEmitterEvents>;

export type PointableOptions = {
  // Max milliseconds until a singleDown is considered "committed" to being a single press
  shortPressMs?: number, 

  doublePress?: boolean,
  // Max milliseconds between a singleUp and a doubleDown
  doublePressMs?: number, 

  longPress?: boolean,
  // Min milliseconds to consider a singleDown a long press
  longPressMs?: number,

  maxDrift?: number,

  getWorldPosition?: WorldPositionFn,
  screenToWorld?: ScreenToWorldFn,
}

export type PointableBundle = {
  position: Vector2,
  events: PointableEvents,
  handlers: PointableHandlers,
  cancel: () => void,
}

export type PointableHandlers = {
  start: (event: PointerEvent) => void,
  end: (event: PointerEvent) => void,
  move: (event: PointerEvent) => void,
  touchStart: (event: PointerEvent) => void,
}

export type PointableState = {
  state:
    | "initial"
    | "singleDown"
      | "singleDownOrBeginDouble"
      | "singleDownOrLongDown"
      | "singleDownOrLongDownOrBeginDouble" 
    | "singleUpOrBeginDouble"
    | "longDown"
    | "doubleDown"
    | "singleDragging",
  complete: boolean,
  event?: PointerEvent,
  initialPosition: Vector2,
  position: Vector2,
  offset: Vector2,
  maxDrift: number,

  longPressTimeoutID?: TimeoutID,
  doublePressSingleDownTimeoutID?: TimeoutID,
  doublePressSingleUpTimeoutID?: TimeoutID,
}

export type PointableEventPayload = {
  ...PointableState
}
*/

export function makePointable({
  shortPressMs = 100,
  doublePress = false,
  doublePressMs = 500,
  longPress = false,
  longPressMs = 500,
  maxDrift,
  getWorldPosition,
  screenToWorld,
} /*: PointableOptions */ = {}) /*: PointableBundle */ {
  let isDragging = false;

  let state /*: PointableState */ = {
    state: "initial",
    complete: true,

    // Initial position used for drift distance calculation
    initialPosition: new Vector2(),

    // initialDownTimestamp: performance.now(),
    // initialUpTimestamp: performance.now(),

    // Current position of object being pointed/dragged in world coords
    position: new Vector2(),

    // Pixel offset from center of object being dragged
    offset: new Vector2(),

    maxDrift: maxDrift ?? (doublePress || longPress ? defaultMaxDrift : 0),
  };

  const events = createEvents/*:: <PointableEmitterEvents> */();

  const complete = () => {
    state.complete = true;
    state.state = "initial";

    clearTimeout(state.longPressTimeoutID);
    clearTimeout(state.doublePressSingleDownTimeoutID);
    clearTimeout(state.doublePressSingleUpTimeoutID);
  };

  const start = (event /*: PointerEvent */) => {
    // Left button only
    if (event.button !== 0) return;

    state.event = event;

    const _eventPos = getEventPosition(event, screenToWorld);
    const _state = state.state;

    events.emit("down", state);

    if (_state === "initial") {
      event.stopPropagation();

      // Store the initial pointer offset from center of the object
      const prestartPos = getWorldPosition?.();
      if (prestartPos) {
        state.offset.copy(prestartPos).sub(_eventPos);
      } else {
        state.offset.set(0, 0);
      }

      // Keep a copy of initial start position for drift distance calculation
      state.initialPosition.copy(_eventPos);

      // Update the position
      state.position.copy(_eventPos).add(state.offset);

      // Reset completion flag
      state.complete = false;

      // $FlowIgnore
      event.target.setPointerCapture(event.pointerId);

      if (longPress && !doublePress) {
        // If we're configured to consider the possibility of long presses, then
        // this singleDown MAY be the beginning of a long press

        state.longPressTimeoutID = setTimeout(() => {
          if (state.state !== "singleDownOrLongDown") {
            console.warn("longDown ignored", state);
            return;
          }
          state.state = "longDown";
          state.longPressTimeoutID = undefined;
          events.emit("longDown", state);
          events.emit("taaap", state);
        }, longPressMs);

        // Not sure yet if this is a singleDown or longDown event
        state.state = "singleDownOrLongDown";
      } else if (doublePress && !longPress) {
        // If we're configured to consider the possibility of double presses, then
        // this singleDown MAY be the beginning of a double tap

        state.doublePressSingleDownTimeoutID = setTimeout(() => {
          if (state.state !== "singleDownOrBeginDouble") {
            console.warn("singleDown ignored", state);
            return;
          }

          // After the double-press timeout limit, it's confirmed to be a singleDown event
          state.state = "singleDown";
          state.doublePressSingleDownTimeoutID = undefined;
          events.emit("singleDown", state);
        }, shortPressMs /* Note: max short press is usually shorter than doublePressMs */);

        // Not sure yet if this is a singleDown or double press sequence yet
        state.state = "singleDownOrBeginDouble";
      } else if (longPress && doublePress) {
        state.longPressTimeoutID = setTimeout(() => {
          if (state.state !== "singleDownOrLongDownOrBeginDouble") {
            console.warn("longDown ignored", state);
            return;
          }
          state.state = "longDown";
          state.longPressTimeoutID = undefined;
          events.emit("longDown", state);
          events.emit("taaap", state);
        }, longPressMs);

        state.state = "singleDownOrLongDownOrBeginDouble";
      } else {
        state.state = "singleDown";
        events.emit("singleDown", state);
      }
    } else if (_state === "singleUpOrBeginDouble") {
      event.stopPropagation();

      clearTimeout(state.doublePressSingleUpTimeoutID);

      // Update the position
      state.position.copy(_eventPos).add(state.offset);

      events.emit("doubleDown", state);

      state.state = "doubleDown";
    } else {
      // unhandled state
      console.warn("unhandled state in `start`:", _state);
    }
  };

  const end = (event /*: PointerEvent */) => {
    if (state.complete) return;

    state.event = event;

    const _eventPos = getEventPosition(event, screenToWorld);
    const _state = state.state;

    events.emit("up", state);

    if (_state === "singleDown") {
      event.stopPropagation();

      // simple case of a single tap
      events.emit("singleUp", state);
      events.emit("tap", state);

      complete();
    } else if (_state === "singleDownOrLongDown") {
      event.stopPropagation();

      clearTimeout(state.longPressTimeoutID);

      // If the longDown transition hasn't happened yet, then this is a single tap
      events.emit("singleDown", state);
      events.emit("singleUp", state);
      events.emit("tap", state);

      complete();
    } else if (_state === "longDown") {
      event.stopPropagation();

      events.emit("longUp", state);

      complete();
    } else if (_state === "singleDownOrBeginDouble") {
      event.stopPropagation();

      clearTimeout(state.doublePressSingleDownTimeoutID);

      state.doublePressSingleUpTimeoutID = setTimeout(() => {
        if (state.state !== "singleUpOrBeginDouble") {
          console.warn("tap ignored", state);
          return;
        }

        // After the double-press timeout limit, this can't be a double-press
        events.emit("singleDown", state);
        events.emit("singleUp", state);
        events.emit("tap", state);

        state.doublePressSingleUpTimeoutID = undefined;

        complete();
      }, doublePressMs);

      // Not sure yet if this is a singleDown or doubleDown event
      state.state = "singleUpOrBeginDouble";
    } else if (_state === "singleDownOrLongDownOrBeginDouble") {
      if (state.longPressTimeoutID) {
        clearTimeout(state.longPressTimeoutID);
        state.longPressTimeoutID = undefined;

        state.doublePressSingleUpTimeoutID = setTimeout(() => {
          if (state.state !== "singleUpOrBeginDouble") {
            console.warn("tap ignored", state);
            return;
          }

          // After the double-press timeout limit, this can't be a double-press
          events.emit("singleDown", state);
          events.emit("singleUp", state);
          events.emit("tap", state);

          state.doublePressSingleUpTimeoutID = undefined;

          complete();
        }, doublePressMs);

        state.state = "singleUpOrBeginDouble";
      } else {
        console.warn("longpress timeout");
      }
    } else if (_state === "doubleDown") {
      event.stopPropagation();

      events.emit("doubleDown", state);
      events.emit("taptap", state);

      complete();
    } else if (_state === "singleDragging") {
      event.stopPropagation();

      events.emit("dragEnd", state);

      complete();
    } else {
      // unhandled state
      console.warn("unhandled state in `end`:", _state);
    }
  };

  const move = (event /*: PointerEvent */) => {
    if (state.complete || state.state === "initial") return;

    state.event = event;

    const _eventPos = getEventPosition(event, screenToWorld);
    const _state = state.state;

    events.emit("move", state);

    if (
      _state === "singleDown" ||
      _state === "singleDownOrBeginDouble" ||
      _state === "singleDownOrLongDown" ||
      _state === "singleDownOrLongDownOrBeginDouble"
    ) {
      event.preventDefault();

      state.position.copy(_eventPos).add(state.offset);

      const _driftDistance = _eventPos.distanceTo(state.initialPosition);

      if (_driftDistance < state.maxDrift) {
        events.emit("dragMoveOrDrift", state);
        events.emit("dragDrift", state);
      } else {
        clearTimeout(state.longPressTimeoutID);
        clearTimeout(state.doublePressSingleDownTimeoutID);
        clearTimeout(state.doublePressSingleUpTimeoutID);

        state.state = "singleDragging";
        events.emit("dragStart", state);
      }
    } else if (_state === "singleDragging") {
      event.preventDefault();

      state.position.copy(_eventPos).add(state.offset);

      events.emit("dragMoveOrDrift", state);
      events.emit("dragMove", state);
    } else if (
      _state === "longDown" ||
      _state === "doubleDown" ||
      _state === "singleUpOrBeginDouble"
    ) {
      // ignore
    } else {
      // unhandled state
      console.warn("unhandled state in `move`:", _state);
    }

    event.preventDefault();
  };

  const touchStart = (e /*: PointerEvent */) => e.preventDefault();

  return {
    position: state.position,
    events,
    handlers: { start, end, move, touchStart },
    cancel: complete,
  };
}

// Get screen coords from event and convert to world coords
function getEventPosition(
  event /*: PointerEvent */,
  screenToWorld /*: ?ScreenToWorldFn */
) {
  const { clientX: x, clientY: y } = event;
  return new Vector2(x, y).transform(screenToWorld);
}
