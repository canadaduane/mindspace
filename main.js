// @ts-check
import { renderer } from "@b9g/crank/dom";
import { html, svg } from "./utils.js";

let globalIsDragging = false;

function* Svg() {
  const shapes = [];
  let w, h;

  const matchWindowSize = () => {
    w = window.innerWidth;
    h = window.innerHeight;
    this.refresh();
  };

  matchWindowSize();
  window.addEventListener("resize", matchWindowSize);

  const createOrb = ({ clientX: x, clientY: y }) => {
    if (globalIsDragging) return;
    shapes.push(html`<${Orb} x=${x} y=${y} />`);
  };

  window.addEventListener("pointerup", createOrb);

  while (true) {
    requestAnimationFrame(() => this.refresh());

    const defs = new Set();
    shapes.forEach((c) => {
      if (c.tag.defs) {
        defs.add(c.tag.defs);
      }
    });

    yield html` <svg
      viewBox="0 0 ${w} ${h}"
      style="width: ${w}px; height: ${h}px;"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>${[...defs]}</defs>
      ${shapes}
    </svg>`;
  }
}

function* Orb({ x = 0, y = 0, r = 50 }) {
  const pos = { x, y };
  let dragging = null;

  const start = ({ target, clientX: x, clientY: y, pointerId, button }) => {
    if (button !== 0) return; // left button only
    dragging = { dx: pos.x - x, dy: pos.y - y };
    globalIsDragging = true;
    target.setPointerCapture(pointerId);
  };

  const end = (_event) => {
    dragging = null;
    setTimeout(() => (globalIsDragging = false), 50);
  };

  const move = ({ clientX: x, clientY: y }) => {
    if (!dragging) return;

    pos.x = x + dragging.dx;
    pos.y = y + dragging.dy;

    // this.refresh();
  };

  const preventDefault = (e) => e.preventDefault();

  while (true) {
    yield svg`<circle
      onpointerdown=${start}
      onpointerup=${end}
      onpointercancel=${end} 
      onpointermove=${move}
      ontouchstart=${preventDefault}
      cx=${pos.x}
      cy=${pos.y}
      r=${r}
      fill="rgba(170, 170, 170, 0.5)"
      stroke="rgba(200, 200, 200, 1)"
      stroke-width="2"
    />`;
  }
}

renderer.render(html` <${Svg} /> `, document.body);
