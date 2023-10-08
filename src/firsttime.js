import { html } from "./utils.js";
import { Transition } from "./transition.js";

export function* FirstTime() {
  let show = true;

  setTimeout(() => {
    show = false;
    this.refresh();
  }, 3000);

  for ({} of this) {
    yield html`
    <!-- firsttime styles --> 
    <style>
      .firsttime--big-center {
        position: absolute;
        top: 50vh;
        left: 100vw;
        transform: translateX(-50%);
        z-index: 2;
        display: flex;
        align-items: center;
        justify-content: center;

        width: 50vw;
        height: 100vh;
        color: var(--dullText);
        font-family: sans-serif;
        font-size: 28px;
        text-align: center;
        line-height: 24px;

        pointer-events: none;
      }
    </style>
    <${Transition} active=${show}>
    <div class="firsttime--big-center">
      ${
        window.navigator.maxTouchPoints > 0
          ? "tap to start a mind map"
          : "click to start a mind map"
      }
    </div>
    </${Transition}>`;
  }
}
