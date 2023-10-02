import { renderer } from "crank/dom";
import { jsx as html } from "crank/standalone";

function* Svg() {
  let count = 0;

  const timer = setInterval(() => {
    count += 0.05;
    this.refresh();
  }, 16);

  try {
    while (true) {
      yield html`
        <svg viewBox="0 0 100 100">
          <circle cx="50" cy="50" r=${count + 5} />
        </svg>
      `;
    }
  } finally {
    clearInterval(timer);
  }
}

renderer.render(html`<${Svg} />`, document.body);
renderer.render(html`<${Svg} />`, document.body);
