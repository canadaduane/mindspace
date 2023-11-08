import { Portal } from "@b9g/crank/standalone";
import { Vector2 } from "../math/vector2.js";
import { html } from "../utils.js";
import { css } from "../styles.js";
import { tapSize } from "../constants.js";
import { makeDraggable } from "../drag.js";

export function* Tap({ x, y, color }) {
  const pos = new Vector2(x, y);
  const {
    start,
    end,
    move,
    touchStart,
    cancel: cancelDrag,
  } = makeDraggable(pos, {
    onStart: () => {
      // dispatch(this, "selectLine", { shapeId });
    },
    onEnd: ({ didDrift }) => {
      if (!didDrift) {
        // this is a click
      }
    },
    onMove: ({ x, y }) => {
      this.refresh();
    },
  });

  styles();

  for (const { x, y, color } of this) {
    yield html`
      <div
        onpointerdown=${start}
        onpointerup=${end}
        onpointercancel=${end}
        onpointermove=${move}
        ontouchstart=${touchStart}
        class="tap"
        style=${{
          "left": `${pos.x}px`,
          "top": `${pos.y}px`,
          "border-color": color,
          "outline-color": color,
        }}
      />
    `;
  }
}

function styles() {
  css`
    .tap {
      position: absolute;
      transform: translate(-50%, -50%);

      border-radius: 100%;
      outline-width: 0px;
      outline-style: solid;
      transition: outline-width 0.2s ease-in-out;

      width: ${tapSize}px;
      height: ${tapSize}px;
      background-color: oklch(85% 0.2 140);

      display: flex;
      justify-content: center;
      align-items: center;

      overflow-y: auto;
      cursor: default;
    }
  `;
}
