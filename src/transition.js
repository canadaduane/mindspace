import gsap from "gsap";
import { html } from "./utils.js";

export async function* Transition({
  msIn = 1000,
  msOut = 1000,
  props = { opacity: 0 },
}) {
  let mount;
  let animatingEl;
  let dismountTimeout;

  for await (let { children, active } of this) {
    if (active && !animatingEl) mount = true;

    const el = yield mount ? html`${children}` : null;

    if (el && !animatingEl) {
      // Transition animation to mounted
      animatingEl = el;
      clearTimeout(dismountTimeout);
      const gsapProps = { ...props, duration: msIn / 1000 };
      gsap.from(animatingEl, gsapProps);
    } else if (animatingEl && !active) {
      // Transition animation to unmounted
      gsap.to(animatingEl, { ...props, duration: msOut / 1000 });
      dismountTimeout = setTimeout(() => {
        mount = false;
        animatingEl = undefined;
        this.refresh();
      }, msOut);
    }
  }
}
