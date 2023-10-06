import { html } from "./utils.js";

export function* Spike({ x, y, theta }) {
  for ({ x, y, theta } of this) {
    yield html`
      <style>
        .slasheffect {
          position: absolute;
          z-index: 2;
          pointer-events: none;
          width: 0;
          height: 0;
          border-left: 8px solid transparent;
          border-right: 8px solid transparent;
          border-bottom: 16px solid rgba(240, 200, 30, 0.9);
          transform: translate(-50%, -50%) rotate(${theta}rad) scaleX(40%);
        }
      </style>
      <div class="slasheffect" style="left: ${x}px; top: ${y}px"></div>
    `;
  }
}
