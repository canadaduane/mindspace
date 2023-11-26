/**
 * Note that createEvents was taken from the `nanoevents` package; flow types have been added.
 *
 * @flow
 */

/*::
type EventsMap = {
  [event: string]: any,
};

type Unsubscribe = () => void;

export type Emitter<Events: EventsMap> = {
  // Calls each of the listeners registered for a given event.
  emit<K: $Keys<Events>>(
    event: K,
    ...args: Parameters<Events[K]>
  ): void,

  // Event names in keys and arrays with listeners in values.
  events: {
    [K in $Keys<Events>]: Array<Events[K]>,
  },

  // Add a listener for a given event.
  on<K: $Keys<Events>>(
    event: K,
    cb: Events[K]
  ): Unsubscribe,
};
*/

export function createEvents /*:: <Events: EventsMap> */() /*: Emitter<Events> */ {
  const emitter /*: Emitter<Events> */ = {
    events: {},
    emit(event, ...args) {
      for (
        let i = 0,
          callbacks = emitter.events[event] || [],
          length = callbacks.length;
        i < length;
        i++
      ) {
        callbacks[i](...args);
      }
    },
    on(event, cb) {
      (emitter.events[event] ||= []).push(cb);
      return () => {
        emitter.events[event] = emitter.events[event]?.filter((i) => cb !== i);
      };
    },
  };
  return emitter;
}
