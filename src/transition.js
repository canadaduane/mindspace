import * as TWEEN_WITH_DEFAULT from "tween.js";
const TWEEN = TWEEN_WITH_DEFAULT.default;
import { html } from "./utils.js";

function animate(time) {
  window.requestAnimationFrame(animate);
  TWEEN.update(time);
}

animate();

export async function* Transition({
  delayIn = 0,
  msIn = 1500,
  msOut = 1500,
  // props = { opacity: 0 },
}) {
  let mount;
  let animatingEl;
  let transitionState = "init";
  let delayTimeout;

  const style = { opacity: 0 };

  const tween = new TWEEN.Tween(style, false).onUpdate(() => {
    if (!animatingEl) {
      console.warn("no animatingEl!", this);
      return;
    }
    animatingEl.style.setProperty("opacity", style.opacity);
  });

  for await (let { children, active } of this) {
    if (
      active &&
      (transitionState === "init" ||
        transitionState === "out" ||
        transitionState === "out-ready")
    ) {
      mount = true;
      transitionState = "in-ready";
    } else if (!active) {
      if (transitionState === "in" || transitionState === "in-ready") {
        transitionState = "out-ready";
      }
    }

    const el = yield mount ? html`${children}` : null;

    if (!el) continue;

    if (transitionState === "in-ready") {
      animatingEl = el;
      el.style.opacity = 0;

      const start = () => {
        tween
          .stop()
          .to({ opacity: 1 }, msIn)
          .onComplete(() => {})
          .start();
      };

      clearTimeout(delayTimeout);
      if (delayIn > 0) {
        delayTimeout = setTimeout(start, delayIn);
      } else {
        start();
      }

      // Transition animation to mounted
      transitionState = "in";
    }

    if (transitionState === "out-ready") {
      // Transition animation to unmounted

      animatingEl = el;
      clearTimeout(delayTimeout);
      tween
        .stop()
        .to({ opacity: 0 }, msOut)
        .onComplete(() => {
          mount = false;
          transitionState = "init";
          this.refresh();
        })
        .start();

      transitionState = "out";
    }
  }
}
