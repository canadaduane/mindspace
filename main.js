import { renderer } from "@b9g/crank/dom";
import { html, svg } from "./utils.js";
import { ColorWheel, getColorFromCoord } from "./colorwheel.js";
import { applyNodeToShapes, makeNodesMap, makeShapesMap } from "./shape.js";
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
 *   color: string
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
  let { nodes, maxNodeId } = makeNodesMap(initNodes);
  let { shapes, maxShapeId } = makeShapesMap(initShapes);

  let showColorGuide = false;

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

  const createNode = (x, y) => {
    if (globalIsDragging) return;

    const nodeId = ++maxNodeId;
    const shapeId = ++maxShapeId;

    const color = getColorFromCoord(
      x,
      y,
      window.innerWidth,
      window.innerHeight
    );

    // Create a circle that controls the node
    const controllerShape = {
      type: "circle",
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
      color,
      text: `n${nodeId}`,
      dependents: [
        { shapeId, attrs: { x: "cx", y: "cy", color: "color" } },
        ...dependents,
      ],
    };
    console.log("create node", nodeId, node);
    nodes.set(nodeId, node);

    this.refresh();

    return node;
  };

  let recentlyCreatedNode;
  let createdNodeTimer;
  const pos = { x: 0, y: 0 };
  const { start, end, move, touchStart } = makeDraggable(pos, {
    onStart: (x, y) => {
      // If a div is actively focused, first blur it
      if (document.activeElement.tagName === "DIV") {
        return false;
      }
      console.log("activeEl", document.activeElement);
      recentlyCreatedNode = createNode(x, y);
      createdNodeTimer = setTimeout(() => {
        showColorGuide = true;
        this.refresh();
      }, 200);
    },
    onEnd: (x, y) => {
      clearTimeout(createdNodeTimer);
      showColorGuide = false;
      this.refresh();
    },
    onMove: (x, y) => {
      recentlyCreatedNode.x = x;
      recentlyCreatedNode.y = y;
      recentlyCreatedNode.color = getColorFromCoord(
        x,
        y,
        window.innerWidth,
        window.innerHeight
      );
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
        ${showColorGuide && svg`<${ColorWheel} w=${w} h=${h} />`}
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

function* Orb({ nodeId, x = 0, y = 0, color }) {
  const pos = { x, y };

  let editEl;
  let editMode = false;
  let rectShape = false;
  let didDrag = false;
  const { start, end, move, touchStart } = makeDraggable(pos, {
    onStart: () => {
      globalIsDragging = true;
      didDrag = false;
    },
    onEnd: () => {
      setTimeout(() => (globalIsDragging = false), 50);
      if (!didDrag) {
        setTimeout(() => editEl?.focus(), 100);
        editMode = true;
        rectShape = true;
        this.refresh();
      }
    },
    onMove: () => {
      didDrag = true;
      this.dispatchEvent(
        new CustomEvent("nodeMoved", {
          bubbles: true,
          detail: { nodeId, ...pos },
        })
      );
    },
  });

  for ({ x, y, color } of this) {
    pos.x = x;
    pos.y = y;
    yield html`<div
      onpointerdown=${start}
      onpointerup=${end}
      onpointercancel=${end}
      onpointermove=${move}
      ontouchstart=${touchStart}
      class="orb ${rectShape && "to-rect"}"
      style="left: ${pos.x}px; top: ${pos.y}px; border-color: ${color}; outline-color: ${color}"
    >
      <div
        class="edit"
        contenteditable=${editMode}
        c-ref=${(el) => (editEl = el)}
      ></div>
    </div>`;
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

function* FirstTime() {
  let fade = false;
  let firsttime = true;

  setTimeout(() => {
    fade = true;
    this.refresh();
  }, 1800);

  setTimeout(() => {
    firsttime = false;
    this.refresh();
  }, 3000);

  for ({} of this) {
    yield firsttime
      ? html` <style>
            .firsttime--big-center {
              position: absolute;
              top: 0px;
              left: 50%;
              transform: translateX(-50%);
              z-index: 2;
              display: flex;
              align-items: center;

              width: 50vw;
              height: 100vh;
              color: var(--dullText);
              font-family: sans-serif;
              font-size: 2rem;
              text-align: center;
              line-height: 1.8rem;

              pointer-events: none;

              opacity: 1;
              transition-property: opacity;
              transition-duration: 1.2s;
            }
            .firsttime--fade-out {
              opacity: 0;
            }
          </style>
          <div class="firsttime--big-center ${fade && "firsttime--fade-out"}">
            hold and drag to start
          </div>`
      : null;
  }
}

renderer.render(html`<${Svg} /><${FirstTime} />`, document.body);
