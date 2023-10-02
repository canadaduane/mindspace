import { renderer } from "crank/dom";
import { jsx as html } from "crank/standalone";

function* Svg({ name = "World" }) {
  let count = 0;
  while (true) {
    count++;
    yield html`<svg viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="20" />
    </svg>`;
  }
}

renderer.render(html`<${Svg} />`, document.body);
renderer.render(html`<${Svg} />`, document.body);
