import { renderer } from "@b9g/crank/dom";
import { html, svg } from "./utils.js";

let globalIsDragging = false;
/**
 * nodeId: number
 * Node
 * {
 *   x: number
 *   y: number
 *   text: string
 *   dependents: Dependent[]
 * }
 *
 * Dependent
 * {
 *   shapeId: number
 *   attrs: Record<string, string>
 * }
 *
 * shapeId: number
 * Shape
 * {
 *   type: "circle"
 *   controlsNodeId: number
 *   cx: number
 *   cy: number
 * } | {
 *   type: "line"
 *   x1: number
 *   y1: number
 *   x2: number
 *   y2: number
 * }
 */

function* Svg({ nodes: initNodes = [], shapes: initShapes = [] }) {
  console.log({ initNodes, initShapes });

  let maxNodeId = 0;
  const nodes = new Map(
    initNodes.map(({ nodeId, ...node }) => {
      if (maxNodeId < nodeId) maxNodeId = nodeId;
      return [nodeId, node];
    })
  );
  console.log({ nodes: [...nodes.values()] });

  let maxShapeId = 0;
  const shapes = new Map(
    initShapes.map(({ shapeId, ...shape }) => {
      if (maxShapeId < shapeId) maxShapeId = shapeId;
      return [shapeId, shape];
    })
  );

  let w, h;

  const matchWindowSize = () => {
    w = window.innerWidth;
    h = window.innerHeight;
    this.refresh();
  };

  matchWindowSize();
  window.addEventListener("resize", matchWindowSize);

  this.addEventListener("nodeMoved", ({ detail: { nodeId, x, y } }) => {
    const node = nodes.get(nodeId);
    if (node) {
      node.x = x;
      node.y = y;
    } else {
      console.warn("can't set node movement", nodeId);
    }
  });

  // const createOrb = ({ clientX: x, clientY: y }) => {
  //   if (globalIsDragging) return;
  //   const orb1 = html`<${Orb} x=${x} y=${y} />`;
  //   const lines = [];
  //   for (let shape of shapes) {
  //     if (shape.tag === Orb) {
  //       lines.push(html`<${Line} x1=${x} y1=${y} orb2=${shape} />`);
  //     }
  //   }
  //   for (let line of lines) shapes.unshift(line);
  //   shapes.push(orb1);
  // };

  // window.addEventListener("pointerup", createOrb);

  while (true) {
    requestAnimationFrame(() => this.refresh());

    for (let node of nodes.values()) {
      for (let { shapeId, attrs } of node.dependents) {
        const shape = shapes.get(shapeId);
        if (shape) {
          for (let fromAttr in attrs) {
            let toAttr = attrs[fromAttr];
            shape[toAttr] = node[fromAttr];
          }
        }
      }
    }
    // console.log("shapes", [...shapes.values()]);

    const defs = [];
    // const defs = new Set();
    // shapes.forEach((c) => {
    //   if (c.tag.defs) {
    //     defs.add(c.tag.defs);
    //   }
    // });

    yield html`<svg
      viewBox="0 0 ${w} ${h}"
      style="width: ${w}px; height: ${h}px;"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>${[...defs]}</defs>
      ${[...shapes.entries()].map(([shapeId, shape]) => {
        switch (shape.type) {
          case "circle":
            return svg`
              <${Orb} 
                crank-key=${shapeId}
                nodeId=${shape.controlsNodeId} 
                x=${shape.cx}
                y=${shape.cy}
              /> 
            `;

          case "line":
            return svg`
              <${Line}
                crank-key=${shapeId}
                x1=${shape.x1}
                y1=${shape.y1}
                x2=${shape.x2}
                y2=${shape.y2}
              />
            `;
        }
      })}
    </svg>`;
  }
}

function* Orb({ nodeId, x = 0, y = 0, r = 50 }) {
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

    this.dispatchEvent(
      new CustomEvent("nodeMoved", {
        bubbles: true,
        detail: { nodeId, ...pos },
      })
    );
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

function* Line({ x1, y1, x2, y2 }) {
  // window.addEventListener("pointermove", () => {
  //   if (!globalIsDragging) return;
  //   this.refresh();
  // });

  for ({ x1, y1, x2, y2 } of this) {
    // console.log({ x1, y1, x2, y2 });
    yield svg`<line
      x1=${x1}
      y1=${y1}
      x2=${x2}
      y2=${y2}
      stroke="rgba(200, 200, 200, 1)"
      stroke-width="2"
    />`;
  }
}

const n0 = {
  nodeId: 0,
  x: 50,
  y: 50,
  text: "n0",
  dependents: [
    { shapeId: 0, attrs: { x: "cx", y: "cy" } },
    { shapeId: 2, attrs: { x: "x1", y: "y1" } },
  ],
};
const n1 = {
  nodeId: 1,
  x: 100,
  y: 120,
  text: "n1",
  dependents: [
    { shapeId: 1, attrs: { x: "cx", y: "cy" } },
    { shapeId: 2, attrs: { x: "x2", y: "y2" } },
  ],
};

const s0 = { shapeId: 0, type: "circle", controlsNodeId: 0 };
const s1 = { shapeId: 1, type: "circle", controlsNodeId: 1 };
const s2 = { shapeId: 2, type: "line" };

renderer.render(
  html`<${Svg} nodes=${[n0, n1]} shapes=${[s0, s1, s2]} />`,
  document.body
);
