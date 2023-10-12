import * as TWEEN_WITH_DEFAULT from "tween.js";
const TWEEN = TWEEN_WITH_DEFAULT.default;
import { html } from "./utils.js";

function animate(time) {
  window.requestAnimationFrame(animate);
  TWEEN.update(time);
}

animate();

const pixelProperties = new Set([
  "top",
  "left",
  "right",
  "bottom",
  "width",
  "height",
]);

export async function* Transition({
  in: { delay: delayIn = 0, ms: msIn = 1500, style: styleIn = { opacity: 1 } },
  out: {
    delay: delayOut = 0,
    ms: msOut = 1500,
    style: styleOut = { opacity: 0 },
  },
}) {
  let mount;
  let animatingEl;
  let transitionState = "init";
  let delayTimeout;

  const styles = { ...styleOut };
  const applyStyles = (el) => {
    for (const [propertyName, value] of Object.entries(styles)) {
      el.style.setProperty(
        propertyName,
        pixelProperties.has(propertyName) ? value + "px" : value
      );
    }
  };

  const tween = new TWEEN.Tween(styles, false).onUpdate(() => {
    if (!animatingEl) {
      console.warn("no animatingEl!", this);
      return;
    }
    applyStyles(animatingEl);
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
      applyStyles(el);

      const start = () => {
        tween
          .stop()
          .to(styleIn, msIn)
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
        .to(styleOut, msOut)
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
