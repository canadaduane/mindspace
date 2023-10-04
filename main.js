import { renderer } from "@b9g/crank/dom";
import Color from "colorjs.io";
import { html, svg } from "./utils.js";
import { ColorWheel } from "./colorwheel.js";
import { applyNodeToShapes } from "./shape.js";
import { makeDraggable } from "./drag.js";

let globalIsDragging = false;
const lineMaxDistance = 200;
const lineTransition = 5;

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
 *   color: string
 *   cx: number
 *   cy: number
 * } | {
 *   type: "line"
 *   color: string
 *   x1: number
 *   y1: number
 *   x2: number
 *   y2: number
 * }
 */

function* Svg({ nodes: initNodes = [], shapes: initShapes = [] }) {
  let maxNodeId = 0;
  const nodes = new Map(
    initNodes.map(({ nodeId, ...node }) => {
      if (maxNodeId < nodeId) maxNodeId = nodeId;
      return [nodeId, node];
    })
  );

  let maxShapeId = 0;
  const shapes = new Map(
    initShapes.map(({ shapeId, ...shape }) => {
      if (maxShapeId < shapeId) maxShapeId = shapeId;
      return [shapeId, shape];
    })
  );

  let w = window.innerWidth,
    h = window.innerHeight;

  const matchWindowSize = () => {
    w = window.innerWidth;
    h = window.innerHeight;
    this.refresh();
  };

  window.addEventListener("resize", matchWindowSize);

  this.addEventListener("nodeMoved", ({ detail: { nodeId, x, y } }) => {
    const node = nodes.get(nodeId);
    if (node) {
      node.x = x;
      node.y = y;
      this.refresh();
    } else {
      console.warn("can't set node movement", nodeId);
    }
  });

  let explicitlySelectedColor = null;

  this.addEventListener("colorSelected", ({ detail: { color } }) => {
    explicitlySelectedColor = color;
    console.log("colorSelected", color);
  });

  const createNode = (x, y) => {
    if (globalIsDragging) return;

    const nodeId = ++maxNodeId;
    const shapeId = ++maxShapeId;

    const w = window.innerWidth;
    const h = window.innerHeight;
    // const size = w > h ? h : w;
    const a = (x / w - 0.5) * 0.8;
    const b = (y / h - 0.5) * 0.8;
    const color =
      explicitlySelectedColor ??
      new Color("oklab", [1, a, b]).toString({
        format: "rgba",
      });
    console.log("create color", color);

    // Create a circle that controls the node
    const controllerShape = {
      type: "circle",
      color,
      cx: x,
      cy: y,
      controlsNodeId: nodeId,
    };
    shapes.set(shapeId, controllerShape);
    console.log("create controllerShape", shapeId, controllerShape);

    const dependents = [];
    // Create lines from this node to all other nodes
    for (let otherNode of nodes.values()) {
      const shapeId = ++maxShapeId;
      const connectShape = { type: "line" };

      console.log("create connectShape", shapeId, connectShape);
      shapes.set(shapeId, connectShape);
      dependents.push({ shapeId, attrs: { x: "x2", y: "y2" } });
      otherNode.dependents.push({ shapeId, attrs: { x: "x1", y: "y1" } });
    }

    // Create the new node that all shapes depend on for position updates
    const node = {
      x,
      y,
      text: `n${nodeId}`,
      dependents: [{ shapeId, attrs: { x: "cx", y: "cy" } }, ...dependents],
    };
    console.log("create node", nodeId, node);
    nodes.set(nodeId, node);

    this.refresh();

    return node;
  };

  // window.addEventListener("pointerdown", createNode);

  let recentlyCreatedNode;
  const pos = { x: 0, y: 0 };
  const { start, end, move, touchStart } = makeDraggable(pos, {
    onStart: (x, y) => {
      recentlyCreatedNode = createNode(x, y);
    },
    onMove: (x, y) => {
      recentlyCreatedNode.x = x;
      recentlyCreatedNode.y = y;
      this.refresh();
    },
  });

  let svgShapes = [],
    htmlShapes = [];

  while (true) {
    for (let node of nodes.values()) {
      applyNodeToShapes(node, shapes);
    }

    svgShapes.length = 0;
    htmlShapes.length = 0;
    for (let [shapeId, shape] of shapes.entries()) {
      if (shape.type === "line") svgShapes.push([shapeId, shape]);
      if (shape.type === "circle") htmlShapes.push([shapeId, shape]);
    }

    yield html`<svg
        viewBox="0 0 ${w} ${h}"
        style="width: ${w}px; height: ${h}px;"
        xmlns="http://www.w3.org/2000/svg"
        onpointerdown=${start}
        onpointerup=${end}
        onpointercancel=${end}
        onpointermove=${move}
        ontouchstart=${touchStart}
      >
        <${ColorWheel} w=${w} h=${h} />
        ${svgShapes.map(([shapeId, shape]) => {
          return html`<${Line}
            crank-key=${shapeId}
            x1=${shape.x1}
            y1=${shape.y1}
            x2=${shape.x2}
            y2=${shape.y2}
          /> `;
        })}
      </svg>

      ${htmlShapes.map(([shapeId, shape]) => {
        return svg`
              <${Orb} 
                crank-key=${shapeId}
                nodeId=${shape.controlsNodeId} 
                color=${shape.color}
                x=${shape.cx}
                y=${shape.cy}
              /> 
            `;
      })} `;
  }
}

function* Orb({ nodeId, x = 0, y = 0, r = 50, color }) {
  const pos = { x, y };

  const { start, end, move, touchStart } = makeDraggable(pos, {
    onStart: () => {
      globalIsDragging = true;
    },
    onEnd: () => {
      setTimeout(() => (globalIsDragging = false), 50);
    },
    onMove: () => {
      this.dispatchEvent(
        new CustomEvent("nodeMoved", {
          bubbles: true,
          detail: { nodeId, ...pos },
        })
      );
    },
  });

  for ({ x, y } of this) {
    pos.x = x;
    pos.y = y;
    yield html`<div
      onpointerdown=${start}
      onpointerup=${end}
      onpointercancel=${end}
      onpointermove=${move}
      ontouchstart=${touchStart}
      class="orb"
      style="left: ${pos.x}px; top: ${pos.y}px; width: ${r * 2}px; height: ${r *
      2}px; border-color: ${color ?? "rgba(200, 200, 200, 1)"}"
    ></div>`;
  }
}

function* Line({ x1, y1, x2, y2 }) {
  for ({ x1, y1, x2, y2 } of this) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const opacity =
      1 -
      1 / (1 + Math.pow(Math.E, (lineMaxDistance - distance) / lineTransition));
    yield svg`<line
      x1=${x1}
      y1=${y1}
      x2=${x2}
      y2=${y2}
      stroke="rgba(240, 240, 240, ${opacity})"
      stroke-width="3"
    />`;
  }
}

renderer.render(html` <${Svg} /> `, document.body);
