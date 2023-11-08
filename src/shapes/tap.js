import { Portal } from "@b9g/crank/standalone";
import { Vector2 } from "../math/vector2.js";
import { html } from "../utils.js";
import { css } from "../styles.js";
import { tapSize, orbSize } from "../constants.js";
import { makeDraggable } from "../drag.js";

/*::
import type { TapState } from "../shapes.js"
*/

export function* Tap({ x, y, tapState }) {
  for (const { x, y, tapState } of this) {
    const color = getColorFromTapState(tapState);
    const size = getSizeFromTapState(tapState);
    yield html`
      <div
        class="tap"
        style=${{
          "left": `${x}px`,
          "top": `${y}px`,
          "background-color": color,
          "width": `${size}px`,
          "height": `${size}px`,
        }}
      />
    `;
  }
}

function getColorFromTapState(tapState /*: TapState */) {
  switch (tapState) {
    case "create":
      return "oklch(85% 0.2 140)";
    case "creating":
      return "var(--defaultOrbFill)";
    case "select":
      return "oklch(85% 0.2 92)";
    case "delete":
      return "oklch(85% 0.2 18)";
  }
}

function getSizeFromTapState(tapState /*: TapState */) {
  switch (tapState) {
    case "create":
      return tapSize;
    case "creating":
      return orbSize;
    case "select":
      return tapSize / 2;
    case "delete":
      return tapSize;
  }
}

css`
  .tap {
    position: absolute;
    transform: translate(-50%, -50%);
    pointer-events: none;

    border-radius: 100%;
    outline-width: 0px;
    outline-style: solid;
    transition: width 0.2s ease-in-out, height 0.2s ease-in-out,
      background-color 0.2s ease-in-out;

    display: flex;
    justify-content: center;
    align-items: center;

    overflow-y: auto;
    cursor: default;
  }
`;
