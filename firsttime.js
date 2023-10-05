import { html } from "./utils.js";

export function* FirstTime() {
  let fade = false;
  let firsttime = true;

  setTimeout(() => {
    fade = true;
    this.refresh();
  }, 1800);

  setTimeout(() => {
    firsttime = false;
    this.refresh();
  }, 3000);

  for ({} of this) {
    yield firsttime
      ? html` <style>
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

              opacity: 1;
              transition-property: opacity;
              transition-duration: 1.2s;
            }
            .firsttime--fade-out {
              opacity: 0;
            }
          </style>
          <div class="firsttime--big-center ${fade && "firsttime--fade-out"}">
            tap and drag to start
          </div>`
      : null;
  }
}
