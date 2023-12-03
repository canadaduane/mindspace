// @flow

import { html } from "../utils.js";
import { css } from "../styles.js";
import { tapRadius, tapAnimationMs, jotCircleRadius } from "../constants.js";

/*::
import type { TapState } from "../models/figure.js";
*/

export function* Tap(
  /*:: this: any, */ {
    x,
    y,
    tapState,
  } /*: { x: number, y: number, tapState: TapState } */
) /*: any */ {
  let initialDot = true;

  this.schedule(() => {
    setTimeout(() => {
      initialDot = false;
      this.refresh();
    }, 10);
  });

  for (const { x, y, color, tapState } of this) {
    const bgColor = getColorFromTapState(tapState, color);
    yield html`
      <div
        class="tap ${tapState === "creating" ? "tap-creating" : ""}"
        style=${{
          "left": `${x}px`,
          "top": `${y}px`,
          "background-color": bgColor,
        }}
      />
    `;
  }
}

function getColorFromTapState(
  tapState /*: TapState */,
  color /*: string */
) /*: string */ {
  switch (tapState) {
    case "creating":
      return color;
    case "color":
      return color;
    case "select":
      return "oklch(85% 0.2 92)";
    case "delete":
      return "oklch(85% 0.2 18)";
    case "destroying":
      return "var(--defaultOrbFill)";
  }
}

function getSizeFromTapState(tapState /*: TapState */) {
  switch (tapState) {
    case "creating":
      return tapRadius;
    case "color":
      return tapRadius;
    case "select":
      return tapRadius / 2;
    case "delete":
      return tapRadius;
    case "destroying":
      return 5;
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

    width: ${tapRadius * 2}px;
    height: ${tapRadius * 2}px;

    display: flex;
    justify-content: center;
    align-items: center;

    overflow-y: auto;
    cursor: default;
  }

  .tap-creating {
    width: ${jotCircleRadius * 2}px;
    height: ${jotCircleRadius * 2}px;
  }

  .tap-creating {
    animation: tap-creating 0.5s linear forwards;
  }

  @keyframes tap-creating {
    0% {
      width: ${tapRadius * 2}px;
      height: ${tapRadius * 2}px;
    }
    100% {
      width: ${jotCircleRadius * 2}px;
      height: ${jotCircleRadius * 2}px;
    }
  }
`;
