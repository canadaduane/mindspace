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
    const size = initialDot ? 5 : getSizeFromTapState(tapState);
    yield html`
      <div
        class="tap"
        style=${{
          "left": `${x}px`,
          "top": `${y}px`,
          "background-color": bgColor,
          "width": `${size}px`,
          "height": `${size}px`,
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
    case "create":
      return "oklch(85% 0.2 140)";
    case "creating":
      return "var(--defaultOrbFill)";
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
    case "create":
      return tapRadius;
    case "creating":
      return jotCircleRadius * 2;
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

    /* prettier-ignore */
    transition:
      width ${tapAnimationMs}ms ease-in-out,
      height ${tapAnimationMs}ms ease-in-out,
      background-color ${tapAnimationMs}ms ease-in-out;

    display: flex;
    justify-content: center;
    align-items: center;

    overflow-y: auto;
    cursor: default;
  }
`;
