// @ts-check
import { renderer } from "@b9g/crank/dom";
import { html, svg } from "./utils.js";

function* Svg({ children }) {
  while (true) {
    requestAnimationFrame(() => this.refresh());

    const defs = new Set();
    children.forEach((c) => {
      if (c.tag.defs) {
        defs.add(c.tag.defs);
      }
    });

    yield html` <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>${[...defs]}</defs>
      ${children}
    </svg>`;
  }
}

function* Orb({ x = 0, r = 0 }) {
  while (true) {
    r += 0.05;
    yield svg`<circle
      cx=${x}
      cy="50"
      r=${r}
      fill="url(#orb-gradient)"
      filter="url(#orb-filter)"
    />`;
  }
}

Orb.defs = svg`
  <radialGradient id="orb-gradient" cx="30%" cy="30%">
    <stop offset="0%" style="stop-color: lightblue;" />
    <stop offset="25%" style="stop-color: deepskyblue;" />
    <stop offset="75%" style="stop-color: dodgerblue;" />
    <stop offset="100%" style="stop-color: darkblue;" />
  </radialGradient>
  <filter id="orb-filter" x="-50%" y="-50%" width="200%" height="200%">
    <feOffset result="offOut" in="SourceAlpha" dx="0" dy="0" />
    <feGaussianBlur result="blurOut" in="offOut" stdDeviation="10" />
    <feBlend in="SourceGraphic" in2="blurOut" mode="normal" />
  </filter>
`;

renderer.render(
  html`
  <${Svg}>
    <${Orb} />
    <${Orb} x=${50}/>
  </${Svg}>
  `,
  document.body
);
