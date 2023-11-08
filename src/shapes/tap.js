import { Portal } from "@b9g/crank/standalone";
import { html } from "../utils.js";
import { css } from "../styles.js";
import { tapSize } from "../constants.js";

export function* Tap() {
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

  for (const { x, y, color } of this) {
    yield html`
      <div
        class="tap"
        style=${{
          "left": `${x}px`,
          "top": `${y}px`,
          "border-color": color,
          "outline-color": color,
        }}
      />
    `;
  }
}
