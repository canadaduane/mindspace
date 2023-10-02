// @ts-check
import { renderer } from "@b9g/crank/dom";
import { jsx as html } from "@b9g/crank/standalone";

function* Svg({ enabled = true }) {
  let r = 0.05;
  while (enabled) {
    r += 0.05;
    requestAnimationFrame(() => this.refresh());
    yield html`
      <svg viewBox="0 0 100 100">
        <circle cx="50" cy="50" r=${r} stroke />
      </svg>
    `;
  }
}

renderer.render(html`<${Svg} />`, document.body);
// renderer.render(html`<${Svg} />`, document.body);
